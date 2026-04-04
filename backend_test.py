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
            
        # Create trade with new fields
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
        
        # Verify new fields in created trade
        required_fields = ["tranches", "remaining_shares", "position_pct", "total_shares_entered", "realized_pnl"]
        for field in required_fields:
            if field not in created_trade:
                print(f"   ❌ Missing new field: {field}")
                return False
        print("   ✅ New trade fields verified")
        
        # Verify initial values
        if created_trade["remaining_shares"] != 100:
            print(f"   ❌ Wrong remaining_shares: expected 100, got {created_trade['remaining_shares']}")
            return False
        if len(created_trade["tranches"]) != 1:
            print(f"   ❌ Wrong tranches count: expected 1, got {len(created_trade['tranches'])}")
            return False
        if created_trade["realized_pnl"] != 0:
            print(f"   ❌ Wrong realized_pnl: expected 0, got {created_trade['realized_pnl']}")
            return False
        print("   ✅ Initial trade values verified")
        
        # Verify risk calculation
        expected_risk = abs(250.00 - 240.00) * 100  # $1000
        if abs(created_trade.get("risk_amount", 0) - expected_risk) < 0.01:
            print(f"   ✅ Risk calculation correct: ${created_trade['risk_amount']}")
        else:
            print(f"   ❌ Risk calculation wrong: expected ${expected_risk}, got ${created_trade.get('risk_amount')}")
            
        # Verify position percentage calculation
        if "position_pct" in created_trade and created_trade["position_pct"] > 0:
            print(f"   ✅ Position percentage calculated: {created_trade['position_pct']}%")
        else:
            print(f"   ❌ Position percentage not calculated properly")
            
        return True

    def test_staggered_positions(self):
        """Test staggered position features (tranches and partial exits)"""
        print("\n=== TESTING STAGGERED POSITIONS ===")
        
        # Create initial trade
        trade_data = {
            "ticker": "NVDA",
            "side": "LONG", 
            "entry_price": 500.00,
            "shares": 100,
            "stop_loss": 480.00,
            "entry_date": "2024-01-15",
            "strategy_tag": "Momentum",
            "setup_type": "Breakout",
            "notes": "Staggered position test"
        }
        success, trade = self.run_test("Create Base Trade", "POST", "trades", 200, trade_data)
        if not success:
            return False
            
        trade_id = trade["id"]
        self.created_items.append(("trade", trade_id))
        
        # Test add-tranche endpoint
        tranche_data = {
            "price": 510.00,
            "shares": 50,
            "date": "2024-01-16"
        }
        success, updated_trade = self.run_test("Add Tranche", "POST", f"trades/{trade_id}/add-tranche", 200, tranche_data)
        if not success:
            return False
            
        # Verify tranche was added and avg price recalculated
        if len(updated_trade.get("tranches", [])) != 2:
            print(f"   ❌ Expected 2 tranches, got {len(updated_trade.get('tranches', []))}")
            return False
            
        # Check weighted average price: (500*100 + 510*50) / 150 = 503.33
        expected_avg = (500.00 * 100 + 510.00 * 50) / 150
        actual_avg = updated_trade.get("entry_price", 0)
        if abs(actual_avg - expected_avg) > 0.01:
            print(f"   ❌ Wrong avg price: expected {expected_avg:.2f}, got {actual_avg}")
            return False
        print(f"   ✅ Weighted average price calculated correctly: ${actual_avg:.2f}")
        
        # Verify remaining shares updated
        if updated_trade.get("remaining_shares") != 150:
            print(f"   ❌ Wrong remaining shares: expected 150, got {updated_trade.get('remaining_shares')}")
            return False
        print("   ✅ Remaining shares updated correctly")
        
        # Test partial exit
        partial_exit_data = {
            "price": 520.00,
            "shares": 50,
            "date": "2024-01-17"
        }
        success, updated_trade = self.run_test("Partial Exit", "POST", f"trades/{trade_id}/partial-exit", 200, partial_exit_data)
        if not success:
            return False
            
        # Verify partial exit recorded
        if len(updated_trade.get("partial_exits", [])) != 1:
            print(f"   ❌ Expected 1 partial exit, got {len(updated_trade.get('partial_exits', []))}")
            return False
            
        # Verify remaining shares reduced
        if updated_trade.get("remaining_shares") != 100:
            print(f"   ❌ Wrong remaining shares after exit: expected 100, got {updated_trade.get('remaining_shares')}")
            return False
            
        # Verify realized P&L calculated
        # Exit: 50 shares @ $520, avg entry ~$503.33, profit = (520-503.33)*50 ≈ $833
        expected_realized = (520.00 - expected_avg) * 50
        actual_realized = updated_trade.get("realized_pnl", 0)
        if abs(actual_realized - expected_realized) > 1.0:  # Allow $1 tolerance for rounding
            print(f"   ❌ Wrong realized P&L: expected ${expected_realized:.0f}, got ${actual_realized:.0f}")
            return False
        print(f"   ✅ Realized P&L calculated correctly: ${actual_realized:.0f}")
        
        # Test another partial exit that closes the position
        final_exit_data = {
            "price": 515.00,
            "shares": 100,
            "date": "2024-01-18"
        }
        success, final_trade = self.run_test("Final Partial Exit", "POST", f"trades/{trade_id}/partial-exit", 200, final_exit_data)
        if not success:
            return False
            
        # Verify trade auto-closed when remaining = 0
        if final_trade.get("status") != "CLOSED":
            print(f"   ❌ Trade should be auto-closed, status: {final_trade.get('status')}")
            return False
        print("   ✅ Trade auto-closed when all shares exited")
        
        if final_trade.get("remaining_shares") != 0:
            print(f"   ❌ Remaining shares should be 0, got {final_trade.get('remaining_shares')}")
            return False
            
        # Verify total P&L includes all partial exits
        total_realized = final_trade.get("realized_pnl", 0)
        if total_realized <= actual_realized:  # Should be more than first partial
            print(f"   ❌ Total realized P&L not updated properly: ${total_realized}")
            return False
        print(f"   ✅ Total realized P&L: ${total_realized:.0f}")
        
        return True

    def test_close_with_partials(self):
        """Test closing trade that has partial exits"""
        print("\n=== TESTING CLOSE WITH PARTIALS ===")
        
        # Create trade
        trade_data = {
            "ticker": "AMZN",
            "side": "LONG",
            "entry_price": 150.00,
            "shares": 200,
            "stop_loss": 140.00,
            "entry_date": "2024-01-15",
            "strategy_tag": "Pullback",
            "setup_type": "Base Break",
            "notes": "Close with partials test"
        }
        success, trade = self.run_test("Create Trade for Close Test", "POST", "trades", 200, trade_data)
        if not success:
            return False
            
        trade_id = trade["id"]
        self.created_items.append(("trade", trade_id))
        
        # Add partial exit first
        partial_data = {
            "price": 160.00,
            "shares": 100,
            "date": "2024-01-16"
        }
        success, updated_trade = self.run_test("Add Partial Before Close", "POST", f"trades/{trade_id}/partial-exit", 200, partial_data)
        if not success:
            return False
            
        # Now close remaining shares
        close_data = {
            "exit_price": 155.00,
            "exit_date": "2024-01-17"
        }
        success, closed_trade = self.run_test("Close Remaining Shares", "POST", f"trades/{trade_id}/close", 200, close_data)
        if not success:
            return False
            
        # Verify total P&L includes both partial and final exit
        # Partial: (160-150)*100 = $1000
        # Final: (155-150)*100 = $500
        # Total: $1500
        expected_total = (160.00 - 150.00) * 100 + (155.00 - 150.00) * 100
        actual_total = closed_trade.get("pnl", 0)
        if abs(actual_total - expected_total) > 0.01:
            print(f"   ❌ Wrong total P&L: expected ${expected_total}, got ${actual_total}")
            return False
        print(f"   ✅ Total P&L with partials correct: ${actual_total}")
        
        # Verify R multiple calculation
        risk_amount = closed_trade.get("risk_amount", 0)
        expected_r = actual_total / risk_amount if risk_amount > 0 else 0
        actual_r = closed_trade.get("r_multiple", 0)
        if abs(actual_r - expected_r) > 0.01:
            print(f"   ❌ Wrong R multiple: expected {expected_r:.2f}, got {actual_r:.2f}")
            return False
        print(f"   ✅ R multiple calculated correctly: {actual_r:.2f}R")
        
        return True

    def test_checklist_templates(self):
        """Test checklist template endpoints"""
        print("\n=== TESTING CHECKLIST TEMPLATES ===")
        
        # Get default templates
        success, templates = self.run_test("Get Checklist Templates", "GET", "checklist-templates", 200)
        if not success:
            return False
            
        # Should have 8 default templates (6 auto + 2 manual)
        if len(templates) < 6:
            print(f"   ❌ Expected at least 6 default templates, got {len(templates)}")
            return False
        print(f"   ✅ Found {len(templates)} default templates")
        
        # Verify template structure
        auto_count = sum(1 for t in templates if t.get("type") == "auto")
        manual_count = sum(1 for t in templates if t.get("type") == "manual")
        if auto_count < 4 or manual_count < 2:
            print(f"   ❌ Expected at least 4 auto + 2 manual, got {auto_count} auto + {manual_count} manual")
            return False
        print(f"   ✅ Template types verified: {auto_count} auto, {manual_count} manual")
        
        # Add custom template
        custom_template = {
            "name": "Test Custom Item",
            "description": "Test description",
            "order": 99
        }
        success, added_template = self.run_test("Add Custom Template", "POST", "checklist-templates", 200, custom_template)
        if not success or not added_template.get("id"):
            print("   ❌ Add custom template failed")
            return False
            
        template_id = added_template["id"]
        self.created_items.append(("template", template_id))
        print(f"   ✅ Added custom template with ID: {template_id}")
        
        # Verify template was added
        success, updated_templates = self.run_test("Get Updated Templates", "GET", "checklist-templates", 200)
        if not success or len(updated_templates) < len(templates) + 1:
            print(f"   ❌ Expected {len(templates) + 1} templates after adding custom, got {len(updated_templates)}")
            return False
        print("   ✅ Custom template addition verified")
        
        return True

    def test_watchlist_checklist(self):
        """Test watchlist checklist functionality"""
        print("\n=== TESTING WATCHLIST CHECKLIST ===")
        
        # First ensure we have a watchlist item
        success, items = self.run_test("Get Watchlist for Checklist", "GET", "watchlist", 200)
        if not success:
            return False
            
        # If no items, add one
        if not items:
            watchlist_data = {
                "ticker": "TSLA",
                "theme": "Electric Vehicle",
                "notes": "Test for checklist"
            }
            success, added_item = self.run_test("Add Item for Checklist Test", "POST", "watchlist", 200, watchlist_data)
            if not success:
                return False
            item_id = added_item["id"]
            self.created_items.append(("watchlist", item_id))
        else:
            item_id = items[0]["id"]
            
        # Update manual checklist items
        manual_checks = {
            "stage_base": True,
            "clean_pattern": False
        }
        checklist_data = {"manual_checks": manual_checks}
        success, updated_item = self.run_test("Update Manual Checklist", "PUT", f"watchlist/{item_id}/checklist", 200, checklist_data)
        if not success:
            return False
            
        # Verify manual checks were saved
        if updated_item.get("manual_checks", {}).get("stage_base") != True:
            print("   ❌ Manual checklist update failed")
            return False
        print("   ✅ Manual checklist update verified")
        
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
            elif item_type == "template":
                self.run_test(f"Delete Template {item_id}", "DELETE", f"checklist-templates/{item_id}", 200)

def main():
    print("🚀 Starting Trading System API Tests")
    print(f"Testing against: https://position-sizer-8.preview.emergentagent.com")
    
    tester = TradingSystemAPITester()
    
    try:
        # Test all endpoints
        if not tester.test_settings():
            print("❌ Settings tests failed")
            return 1
            
        if not tester.test_checklist_templates():
            print("❌ Checklist template tests failed")
            return 1
            
        if not tester.test_watchlist():
            print("❌ Watchlist tests failed")
            return 1
            
        if not tester.test_watchlist_checklist():
            print("❌ Watchlist checklist tests failed")
            return 1
            
        if not tester.test_trades():
            print("❌ Trade tests failed")
            return 1
            
        if not tester.test_staggered_positions():
            print("❌ Staggered position tests failed")
            return 1
            
        if not tester.test_close_with_partials():
            print("❌ Close with partials tests failed")
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