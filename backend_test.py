import requests
import sys
import json
from datetime import datetime

class TradingSystemAPITester:
    def __init__(self, base_url="https://position-sizer-8.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_items = []  # Track created items for cleanup

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.text}")
                except:
                    pass

            return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_settings(self):
        """Test settings endpoints"""
        print("\n=== TESTING SETTINGS ===")
        
        # Get settings
        success, settings = self.run_test("Get Settings", "GET", "settings", 200)
        if not success:
            return False
            
        # Update settings
        new_settings = {
            "account_size": 150000,
            "default_risk_pct": 1.5
        }
        success, updated = self.run_test("Update Settings", "PUT", "settings", 200, new_settings)
        if success and updated.get("account_size") == 150000:
            print("   ✅ Settings update verified")
        else:
            print("   ❌ Settings update failed")
            return False
            
        return True

    def test_watchlist(self):
        """Test watchlist endpoints"""
        print("\n=== TESTING WATCHLIST ===")
        
        # Get empty watchlist
        success, items = self.run_test("Get Watchlist", "GET", "watchlist", 200)
        if not success:
            return False
            
        # Search for ticker
        success, search_result = self.run_test("Search Ticker", "GET", "watchlist/search", 200, params={"q": "AAPL"})
        if not success or not search_result.get("ticker"):
            print("   ❌ Ticker search failed")
            return False
        print(f"   ✅ Found ticker: {search_result.get('ticker')} at ${search_result.get('last_price')}")
        
        # Add ticker to watchlist
        watchlist_data = {
            "ticker": "AAPL",
            "theme": "Tech",
            "notes": "Test ticker"
        }
        success, added_item = self.run_test("Add Watchlist Item", "POST", "watchlist", 200, watchlist_data)
        if not success or not added_item.get("id"):
            print("   ❌ Add watchlist item failed")
            return False
        
        item_id = added_item["id"]
        self.created_items.append(("watchlist", item_id))
        print(f"   ✅ Added {added_item['ticker']} with ID: {item_id}")
        
        # Update watchlist item
        update_data = {"theme": "Technology", "notes": "Updated notes"}
        success, updated_item = self.run_test("Update Watchlist Item", "PUT", f"watchlist/{item_id}", 200, update_data)
        if success and updated_item.get("theme") == "Technology":
            print("   ✅ Watchlist item update verified")
        else:
            print("   ❌ Watchlist item update failed")
            return False
            
        # Test refresh (this might be slow due to yfinance)
        print("   🔄 Testing watchlist refresh (may take 5-10 seconds)...")
        success, refreshed = self.run_test("Refresh Watchlist", "POST", "watchlist/refresh", 200)
        if success:
            print("   ✅ Watchlist refresh completed")
        else:
            print("   ❌ Watchlist refresh failed")
            
        return True

    def test_trades(self):
        """Test trade endpoints"""
        print("\n=== TESTING TRADES ===")
        
        # Get trades
        success, trades = self.run_test("Get All Trades", "GET", "trades", 200)
        if not success:
            return False
            
        # Create trade
        trade_data = {
            "ticker": "TSLA",
            "side": "LONG",
            "entry_price": 250.00,
            "shares": 100,
            "stop_loss": 240.00,
            "entry_date": "2024-01-15",
            "strategy_tag": "Breakout",
            "setup_type": "Flag",
            "notes": "Test trade"
        }
        success, created_trade = self.run_test("Create Trade", "POST", "trades", 200, trade_data)
        if not success or not created_trade.get("id"):
            print("   ❌ Create trade failed")
            return False
            
        trade_id = created_trade["id"]
        self.created_items.append(("trade", trade_id))
        print(f"   ✅ Created trade {created_trade['ticker']} with ID: {trade_id}")
        
        # Verify risk calculation
        expected_risk = abs(250.00 - 240.00) * 100  # $1000
        if abs(created_trade.get("risk_amount", 0) - expected_risk) < 0.01:
            print(f"   ✅ Risk calculation correct: ${created_trade['risk_amount']}")
        else:
            print(f"   ❌ Risk calculation wrong: expected ${expected_risk}, got ${created_trade.get('risk_amount')}")
            
        # Close trade
        close_data = {
            "exit_price": 260.00,
            "exit_date": "2024-01-20"
        }
        success, closed_trade = self.run_test("Close Trade", "POST", f"trades/{trade_id}/close", 200, close_data)
        if not success:
            print("   ❌ Close trade failed")
            return False
            
        # Verify P&L calculation
        expected_pnl = (260.00 - 250.00) * 100  # $1000 profit
        if abs(closed_trade.get("pnl", 0) - expected_pnl) < 0.01:
            print(f"   ✅ P&L calculation correct: ${closed_trade['pnl']}")
        else:
            print(f"   ❌ P&L calculation wrong: expected ${expected_pnl}, got ${closed_trade.get('pnl')}")
            
        # Test trade filters
        success, open_trades = self.run_test("Get Open Trades", "GET", "trades", 200, params={"status": "OPEN"})
        success, closed_trades = self.run_test("Get Closed Trades", "GET", "trades", 200, params={"status": "CLOSED"})
        
        return True

    def test_analytics(self):
        """Test analytics endpoint"""
        print("\n=== TESTING ANALYTICS ===")
        
        success, analytics = self.run_test("Get Analytics", "GET", "analytics", 200)
        if not success:
            return False
            
        # Verify analytics structure
        required_keys = ["summary", "equity_curve", "monthly", "strategy_breakdown", "setup_breakdown"]
        for key in required_keys:
            if key not in analytics:
                print(f"   ❌ Missing analytics key: {key}")
                return False
                
        print("   ✅ Analytics structure verified")
        
        # Check summary metrics
        summary = analytics["summary"]
        if "total_trades" in summary and "win_rate" in summary and "profit_factor" in summary:
            print(f"   ✅ Summary metrics: {summary['total_trades']} trades, {summary['win_rate']}% win rate")
        else:
            print("   ❌ Missing summary metrics")
            return False
            
        return True

    def cleanup(self):
        """Clean up created test data"""
        print("\n=== CLEANUP ===")
        for item_type, item_id in self.created_items:
            if item_type == "watchlist":
                self.run_test(f"Delete Watchlist {item_id}", "DELETE", f"watchlist/{item_id}", 200)
            elif item_type == "trade":
                self.run_test(f"Delete Trade {item_id}", "DELETE", f"trades/{item_id}", 200)

def main():
    print("🚀 Starting Trading System API Tests")
    print(f"Testing against: https://position-sizer-8.preview.emergentagent.com")
    
    tester = TradingSystemAPITester()
    
    try:
        # Test all endpoints
        if not tester.test_settings():
            print("❌ Settings tests failed")
            return 1
            
        if not tester.test_watchlist():
            print("❌ Watchlist tests failed")
            return 1
            
        if not tester.test_trades():
            print("❌ Trade tests failed")
            return 1
            
        if not tester.test_analytics():
            print("❌ Analytics tests failed")
            return 1
            
        print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
        
        if tester.tests_passed == tester.tests_run:
            print("🎉 All API tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1
            
    finally:
        tester.cleanup()

if __name__ == "__main__":
    sys.exit(main())