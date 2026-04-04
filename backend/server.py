from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Pydantic Models ───

class WatchlistItemCreate(BaseModel):
    ticker: str
    theme: str = ""
    notes: str = ""

class WatchlistItemUpdate(BaseModel):
    theme: Optional[str] = None
    notes: Optional[str] = None

class TradeCreate(BaseModel):
    ticker: str
    side: str = "LONG"
    entry_price: float
    shares: float
    stop_loss: float
    entry_date: str
    strategy_tag: str = ""
    setup_type: str = ""
    notes: str = ""

class TradeUpdate(BaseModel):
    ticker: Optional[str] = None
    side: Optional[str] = None
    entry_price: Optional[float] = None
    shares: Optional[float] = None
    stop_loss: Optional[float] = None
    entry_date: Optional[str] = None
    strategy_tag: Optional[str] = None
    setup_type: Optional[str] = None
    notes: Optional[str] = None

class TradeClose(BaseModel):
    exit_price: float
    exit_date: str

class SettingsUpdate(BaseModel):
    account_size: Optional[float] = None
    default_risk_pct: Optional[float] = None

# ─── yfinance helpers ───

def _fetch_ticker_data(tickers_list):
    """Fetch market data for a list of tickers using yfinance. Runs in a thread."""
    import yfinance as yf
    results = {}

    try:
        spy = yf.Ticker("SPY")
        spy_hist = spy.history(period="6mo")
        if spy_hist.empty:
            logger.error("Could not fetch SPY data")
            return results
    except Exception as e:
        logger.error(f"SPY fetch error: {e}")
        return results

    for sym in tickers_list:
        try:
            stock = yf.Ticker(sym)
            hist = stock.history(period="6mo")
            if hist.empty or len(hist) < 5:
                continue

            close = hist['Close']
            last_price = float(close.iloc[-1])
            prev_close = float(close.iloc[-2])
            change_pct = ((last_price - prev_close) / prev_close) * 100

            # ADR% (20-day average daily range as % of close)
            daily_range_pct = (hist['High'] - hist['Low']) / hist['Close'] * 100
            adr_pct = float(daily_range_pct.tail(20).mean())

            # RS vs SPY (63-day lookback ~3 months)
            lookback = min(63, len(hist), len(spy_hist))
            stock_ret = (float(close.iloc[-1]) / float(close.iloc[-lookback]) - 1) * 100
            spy_ret = (float(spy_hist['Close'].iloc[-1]) / float(spy_hist['Close'].iloc[-lookback]) - 1) * 100
            rs_spy = round(stock_ret - spy_ret, 2)

            # EMAs
            ema10 = float(close.ewm(span=10).mean().iloc[-1])
            ema20 = float(close.ewm(span=20).mean().iloc[-1])
            ema50 = float(close.ewm(span=50).mean().iloc[-1])

            adr_dollars = adr_pct / 100 * last_price
            ext_10ema = round((last_price - ema10) / adr_dollars, 2) if adr_dollars > 0 else 0
            ext_20ema = round((last_price - ema20) / adr_dollars, 2) if adr_dollars > 0 else 0
            ext_50ema = round((last_price - ema50) / adr_dollars, 2) if adr_dollars > 0 else 0

            # Last 3 days %
            d1 = ((float(close.iloc[-1]) / float(close.iloc[-2])) - 1) * 100
            d2 = ((float(close.iloc[-2]) / float(close.iloc[-3])) - 1) * 100 if len(hist) > 2 else 0
            d3 = ((float(close.iloc[-3]) / float(close.iloc[-4])) - 1) * 100 if len(hist) > 3 else 0
            combined_3d = d1 + d2 + d3

            # Check if all 3 days were up
            all_3_up = d1 > 0 and d2 > 0 and d3 > 0

            results[sym] = {
                "last_price": round(last_price, 2),
                "change_pct": round(change_pct, 2),
                "rs_spy": rs_spy,
                "adr_pct": round(adr_pct, 2),
                "ext_10ema": ext_10ema,
                "ext_20ema": ext_20ema,
                "ext_50ema": ext_50ema,
                "day1_pct": round(d1, 2),
                "day2_pct": round(d2, 2),
                "day3_pct": round(d3, 2),
                "combined_3d_pct": round(combined_3d, 2),
                "combined_gt_adr": abs(combined_3d) > adr_pct,
                "all_3_up": all_3_up,
                "last_updated": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Error fetching {sym}: {e}")
    return results


def _validate_ticker(symbol):
    """Validate if a ticker exists in yfinance."""
    import yfinance as yf
    try:
        t = yf.Ticker(symbol)
        info = t.history(period="5d")
        if info.empty:
            return None
        last = float(info['Close'].iloc[-1])
        name = symbol.upper()
        try:
            fast_info = t.fast_info
            name = getattr(fast_info, 'shortName', symbol.upper()) or symbol.upper()
        except Exception:
            pass
        return {"ticker": symbol.upper(), "name": name, "last_price": round(last, 2)}
    except Exception:
        return None


# ─── Settings ───

async def get_settings():
    s = await db.settings.find_one({"id": "default"}, {"_id": 0})
    if not s:
        s = {"id": "default", "account_size": 100000, "default_risk_pct": 1.0}
        await db.settings.insert_one(s)
        s.pop("_id", None)
    return s


@api_router.get("/settings")
async def read_settings():
    return await get_settings()


@api_router.put("/settings")
async def update_settings(data: SettingsUpdate):
    s = await get_settings()
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await db.settings.update_one({"id": "default"}, {"$set": update})
    return await db.settings.find_one({"id": "default"}, {"_id": 0})


# ─── Watchlist ───

@api_router.get("/watchlist")
async def list_watchlist():
    items = await db.watchlist.find({}, {"_id": 0}).to_list(1000)
    return items


@api_router.post("/watchlist")
async def add_watchlist_item(data: WatchlistItemCreate):
    ticker = data.ticker.upper().strip()
    existing = await db.watchlist.find_one({"ticker": ticker}, {"_id": 0})
    if existing:
        raise HTTPException(400, f"{ticker} already in watchlist")

    item = {
        "id": str(uuid.uuid4()),
        "ticker": ticker,
        "theme": data.theme,
        "notes": data.notes,
        "last_price": 0,
        "change_pct": 0,
        "rs_spy": 0,
        "adr_pct": 0,
        "ext_10ema": 0,
        "ext_20ema": 0,
        "ext_50ema": 0,
        "day1_pct": 0,
        "day2_pct": 0,
        "day3_pct": 0,
        "combined_3d_pct": 0,
        "combined_gt_adr": False,
        "all_3_up": False,
        "last_updated": None,
        "added_date": datetime.now(timezone.utc).isoformat()
    }
    await db.watchlist.insert_one(item)
    item.pop("_id", None)
    return item


@api_router.put("/watchlist/{item_id}")
async def update_watchlist_item(item_id: str, data: WatchlistItemUpdate):
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if update:
        await db.watchlist.update_one({"id": item_id}, {"$set": update})
    item = await db.watchlist.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Item not found")
    return item


@api_router.delete("/watchlist/{item_id}")
async def delete_watchlist_item(item_id: str):
    result = await db.watchlist.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Item not found")
    return {"status": "deleted"}


@api_router.post("/watchlist/refresh")
async def refresh_watchlist():
    items = await db.watchlist.find({}, {"_id": 0}).to_list(1000)
    if not items:
        return []
    tickers = [i["ticker"] for i in items]
    data = await asyncio.to_thread(_fetch_ticker_data, tickers)
    for item in items:
        t = item["ticker"]
        if t in data:
            await db.watchlist.update_one({"id": item["id"]}, {"$set": data[t]})
    return await db.watchlist.find({}, {"_id": 0}).to_list(1000)


@api_router.post("/watchlist/refresh/{item_id}")
async def refresh_single_ticker(item_id: str):
    item = await db.watchlist.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Item not found")
    data = await asyncio.to_thread(_fetch_ticker_data, [item["ticker"]])
    if item["ticker"] in data:
        await db.watchlist.update_one({"id": item_id}, {"$set": data[item["ticker"]]})
    return await db.watchlist.find_one({"id": item_id}, {"_id": 0})


@api_router.get("/watchlist/search")
async def search_ticker(q: str = Query(..., min_length=1)):
    result = await asyncio.to_thread(_validate_ticker, q.upper().strip())
    if not result:
        raise HTTPException(404, f"Ticker '{q}' not found")
    return result


# ─── Trades ───

@api_router.get("/trades")
async def list_trades(status: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status.upper()
    trades = await db.trades.find(query, {"_id": 0}).to_list(10000)
    return trades


@api_router.post("/trades")
async def create_trade(data: TradeCreate):
    risk_per_share = abs(data.entry_price - data.stop_loss)
    risk_amount = risk_per_share * data.shares

    trade = {
        "id": str(uuid.uuid4()),
        "ticker": data.ticker.upper().strip(),
        "side": data.side.upper(),
        "entry_price": data.entry_price,
        "exit_price": None,
        "shares": data.shares,
        "stop_loss": data.stop_loss,
        "entry_date": data.entry_date,
        "exit_date": None,
        "strategy_tag": data.strategy_tag,
        "setup_type": data.setup_type,
        "notes": data.notes,
        "status": "OPEN",
        "pnl": 0,
        "pnl_pct": 0,
        "risk_amount": round(risk_amount, 2),
        "r_multiple": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.trades.insert_one(trade)
    trade.pop("_id", None)
    return trade


@api_router.put("/trades/{trade_id}")
async def update_trade(trade_id: str, data: TradeUpdate):
    trade = await db.trades.find_one({"id": trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(404, "Trade not found")
    if trade["status"] == "CLOSED":
        raise HTTPException(400, "Cannot edit closed trade")

    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "entry_price" in update or "stop_loss" in update or "shares" in update:
        ep = update.get("entry_price", trade["entry_price"])
        sl = update.get("stop_loss", trade["stop_loss"])
        sh = update.get("shares", trade["shares"])
        update["risk_amount"] = round(abs(ep - sl) * sh, 2)

    if update:
        await db.trades.update_one({"id": trade_id}, {"$set": update})
    return await db.trades.find_one({"id": trade_id}, {"_id": 0})


@api_router.delete("/trades/{trade_id}")
async def delete_trade(trade_id: str):
    result = await db.trades.delete_one({"id": trade_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Trade not found")
    return {"status": "deleted"}


@api_router.post("/trades/{trade_id}/close")
async def close_trade(trade_id: str, data: TradeClose):
    trade = await db.trades.find_one({"id": trade_id}, {"_id": 0})
    if not trade:
        raise HTTPException(404, "Trade not found")
    if trade["status"] == "CLOSED":
        raise HTTPException(400, "Trade already closed")

    ep = trade["entry_price"]
    shares = trade["shares"]
    side = trade["side"]

    if side == "LONG":
        pnl = (data.exit_price - ep) * shares
    else:
        pnl = (ep - data.exit_price) * shares

    pnl_pct = (pnl / (ep * shares)) * 100 if (ep * shares) > 0 else 0
    risk_amount = trade["risk_amount"]
    r_multiple = pnl / risk_amount if risk_amount > 0 else 0

    update = {
        "exit_price": data.exit_price,
        "exit_date": data.exit_date,
        "status": "CLOSED",
        "pnl": round(pnl, 2),
        "pnl_pct": round(pnl_pct, 2),
        "r_multiple": round(r_multiple, 2)
    }
    await db.trades.update_one({"id": trade_id}, {"$set": update})
    return await db.trades.find_one({"id": trade_id}, {"_id": 0})


# ─── Analytics ───

@api_router.get("/analytics")
async def get_analytics():
    trades = await db.trades.find({}, {"_id": 0}).to_list(10000)
    closed = [t for t in trades if t["status"] == "CLOSED"]
    open_trades = [t for t in trades if t["status"] == "OPEN"]

    total = len(closed)
    wins = [t for t in closed if t["pnl"] > 0]
    losses = [t for t in closed if t["pnl"] <= 0]
    win_count = len(wins)
    loss_count = len(losses)
    win_rate = (win_count / total * 100) if total > 0 else 0

    avg_win = sum(t["pnl"] for t in wins) / win_count if win_count > 0 else 0
    avg_loss = abs(sum(t["pnl"] for t in losses) / loss_count) if loss_count > 0 else 0
    profit_factor = (sum(t["pnl"] for t in wins) / abs(sum(t["pnl"] for t in losses))) if losses and sum(t["pnl"] for t in losses) != 0 else 0
    total_pnl = sum(t["pnl"] for t in closed)
    avg_r = sum(t["r_multiple"] for t in closed) / total if total > 0 else 0

    # Expectancy: (win_rate * avg_win) - (loss_rate * avg_loss)
    expectancy = (win_rate / 100 * avg_win) - ((1 - win_rate / 100) * avg_loss)

    # Equity curve (sorted by exit_date)
    sorted_closed = sorted(closed, key=lambda x: x.get("exit_date", "") or "")
    cumulative = 0
    equity_curve = []
    for t in sorted_closed:
        cumulative += t["pnl"]
        equity_curve.append({
            "date": t.get("exit_date", ""),
            "pnl": round(t["pnl"], 2),
            "cumulative": round(cumulative, 2),
            "ticker": t["ticker"]
        })

    # Monthly breakdown
    monthly = {}
    for t in closed:
        d = t.get("exit_date", "")
        if d:
            month_key = d[:7]  # YYYY-MM
            if month_key not in monthly:
                monthly[month_key] = {"month": month_key, "pnl": 0, "trades": 0, "wins": 0}
            monthly[month_key]["pnl"] = round(monthly[month_key]["pnl"] + t["pnl"], 2)
            monthly[month_key]["trades"] += 1
            if t["pnl"] > 0:
                monthly[month_key]["wins"] += 1
    monthly_data = sorted(monthly.values(), key=lambda x: x["month"])

    # Strategy breakdown
    strategy_map = {}
    for t in closed:
        tag = t.get("strategy_tag", "") or "Untagged"
        if tag not in strategy_map:
            strategy_map[tag] = {"strategy": tag, "pnl": 0, "trades": 0, "wins": 0}
        strategy_map[tag]["pnl"] = round(strategy_map[tag]["pnl"] + t["pnl"], 2)
        strategy_map[tag]["trades"] += 1
        if t["pnl"] > 0:
            strategy_map[tag]["wins"] += 1
    strategy_data = list(strategy_map.values())

    # Setup type breakdown
    setup_map = {}
    for t in closed:
        st = t.get("setup_type", "") or "Untagged"
        if st not in setup_map:
            setup_map[st] = {"setup": st, "pnl": 0, "trades": 0, "wins": 0}
        setup_map[st]["pnl"] = round(setup_map[st]["pnl"] + t["pnl"], 2)
        setup_map[st]["trades"] += 1
        if t["pnl"] > 0:
            setup_map[st]["wins"] += 1
    setup_data = list(setup_map.values())

    # Best and worst trades
    best = sorted(closed, key=lambda x: x["pnl"], reverse=True)[:5]
    worst = sorted(closed, key=lambda x: x["pnl"])[:5]

    return {
        "summary": {
            "total_trades": total,
            "open_positions": len(open_trades),
            "win_count": win_count,
            "loss_count": loss_count,
            "win_rate": round(win_rate, 1),
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "profit_factor": round(profit_factor, 2),
            "total_pnl": round(total_pnl, 2),
            "avg_r_multiple": round(avg_r, 2),
            "expectancy": round(expectancy, 2)
        },
        "equity_curve": equity_curve,
        "monthly": monthly_data,
        "strategy_breakdown": strategy_data,
        "setup_breakdown": setup_data,
        "best_trades": best,
        "worst_trades": worst
    }


# ─── Health ───

@api_router.get("/")
async def root():
    return {"message": "Momentum Trading System API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
