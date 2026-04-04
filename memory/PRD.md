# MomentumOS - Personal Equity Momentum Trading System

## Problem Statement
Build a personal system for watchlist, position sizing, trade log and analytics for an equity momentum trader in US markets.

## Architecture
- **Backend**: FastAPI + MongoDB + yfinance (EOD data)
- **Frontend**: React + Tailwind CSS + Shadcn UI + Recharts
- **Database**: MongoDB (collections: watchlist, trades, settings)
- **No Auth**: Single-user personal tool

## User Persona
- US equity momentum trader
- Needs: watchlist with RS/ADR metrics, position sizing calculator, trade journal, performance analytics

## Core Requirements
1. **Watchlist**: Manual ticker entry, RS vs SPY, ADR%, EMA extensions, 3-day % tracking, theme tagging
2. **Position Sizer**: % risk-based and fixed dollar modes
3. **Trade Log**: Full trade lifecycle (open/close) with strategy tags, setup types, P&L tracking
4. **Analytics**: Win rate, profit factor, equity curve, monthly heatmap, strategy/setup breakdowns
5. **Settings**: Account size, default risk %

## What's Been Implemented (Feb 2026)
- [x] Dashboard with key metrics overview
- [x] Watchlist with yfinance data (RS, ADR%, EMA extensions, 3-day %)
- [x] Position Sizer (both % risk and fixed dollar)
- [x] Trade Log with full CRUD + close trade with P&L calc
- [x] Analytics with equity curve, monthly heatmap, strategy/setup breakdowns
- [x] Settings page for account size and risk %
- [x] Dark terminal-style UI (Work Sans + IBM Plex Sans + JetBrains Mono)

## P0 (Done)
- All core features implemented and tested

## P1 (Backlog)
- Watchlist sorting/filtering by any column
- Trade edit functionality for open trades
- Export trades to CSV
- Sector/theme-based analytics

## P2 (Future)
- Real-time price alerts
- Multi-timeframe RS analysis
- Portfolio heat map
- Screenshot/chart attachment to trades
