# MomentumOS - Personal Equity Momentum Trading System

## Problem Statement
Build a personal system for watchlist, position sizing, trade log and analytics for an equity momentum trader in US markets.

## Architecture
- **Backend**: FastAPI + MongoDB + yfinance (EOD data)
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Database**: MongoDB (collections: watchlist, trades, settings, checklist_templates)
- **No Auth**: Single-user personal tool

## User Persona
- US equity momentum trader
- Needs: watchlist with RS/ADR metrics, position sizing calculator, trade journal, performance analytics, pre-trade discipline checklist

## Core Requirements
1. **Watchlist**: Manual ticker entry, RS vs SPY, ADR%, EMA extensions, 3-day % tracking, theme tagging, sorting, grouping
2. **Position Sizer**: % risk-based and fixed dollar modes
3. **Trade Log**: Full trade lifecycle (open/close) with strategy tags, setup types, P&L tracking
4. **Analytics**: Win rate, profit factor, equity curve, monthly heatmap, strategy/setup breakdowns
5. **Pre-Trade Checklist**: Auto items (RS, range, volume, EMA) + manual items (stage, pattern), customizable
6. **Settings**: Account size, default risk %, checklist template management

## What's Been Implemented
### Phase 1 (Feb 2026)
- [x] Dashboard with key metrics overview
- [x] Watchlist with yfinance data (RS, ADR%, EMA extensions, 3-day %)
- [x] Position Sizer (both % risk and fixed dollar)
- [x] Trade Log with full CRUD + close trade with P&L calc
- [x] Analytics with equity curve, monthly heatmap, strategy/setup breakdowns
- [x] Settings page for account size and risk %
- [x] Dark terminal-style UI (Work Sans + IBM Plex Sans + JetBrains Mono)

### Phase 2 (Feb 2026)
- [x] Pre-trade checklist (4 auto + 2 manual items, customizable)
- [x] Checklist popup per watchlist ticker with auto PASS/FAIL evaluation
- [x] Manual checklist toggles with persistence
- [x] Watchlist column sorting (click headers, asc/desc)
- [x] Watchlist theme grouping with collapsible sections
- [x] Checklist template management in Settings (add/delete custom items)

## P1 (Backlog)
- Export trades to CSV
- Trade edit functionality for open trades
- Sector/theme-based analytics
- Multi-timeframe RS analysis

## P2 (Future)
- Real-time price alerts
- Portfolio heat map
- Screenshot/chart attachment to trades
