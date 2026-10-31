# Test data in the shapes the app's real queries return (keep columns identical to the real selects).
import json, datetime as dt
tz = dt.timezone(dt.timedelta(hours=-4)); now = dt.datetime.now(tz); today = now.date()
iso = lambda d: d.isoformat()
ts = lambda d, h=12, m=0: dt.datetime(d.year, d.month, d.day, h, m, tzinfo=tz).astimezone(dt.timezone.utc).isoformat()
week_start = today - dt.timedelta(days=(today.weekday()))
fx = {
 "accounts": [{"id":3,"code":"AC-00003","name":"Primary Checking (...9292)","account_type":"checking","institution":"Mascoma Bank","status":"active","current_balance_cents":330011,"available_balance_cents":360011,"balance_updated_at":ts(today,7),"rewards":[],"snapshots":[]},
              {"id":2,"code":"AC-00002","name":"Discover It (...5117)","account_type":"credit card","institution":"Discover","status":"active","current_balance_cents":51275,"credit_limit_cents":250000,"balance_updated_at":ts(today,7),"rewards":[],"snapshots":[]}],
 "v_weekly_summary": [{"period_code":"BP-00004","week_start":iso(week_start),"week_end":iso(week_start+dt.timedelta(days=6)),"status":"open","planned_cents":82525,"spent_cents":31244,"remaining_cents":51281,"expected_income_cents":82525}],
 "v_weekly_budget": [], "recurring_bills": [{"code":"RB-00001","name":"Rent","amount_cents":50000,"frequency":"monthly","due_day":1,"autopay":False,"category":None},{"code":"RB-00005","name":"Claude subscription","amount_cents":2000,"frequency":"monthly","due_day":4,"autopay":True,"category":None}],
 "todos": [{"code":"TD-00030","title":"Finish Salem State application","status":"open","due_date":iso(today-dt.timedelta(days=6)),"priority":"high","project":None,"asset":None,"notes":None,"created_at":ts(today-dt.timedelta(days=20)),"someday":False,"reviewed_at":None,"completed_at":None},{"code":"TD-00027","title":"Contact a Salem State advisor","status":"open","due_date":None,"priority":"medium","project":None,"asset":None,"notes":None,"created_at":ts(today-dt.timedelta(days=40)),"someday":False,"reviewed_at":None,"completed_at":None}],
 "location_points": [], "v_visits": [], "locations": [], "transactions": [],
 "pantry_items": [{"quantity":1,"unit":"box","location":"freezer","status":"in_stock","last_purchased_on":iso(today-dt.timedelta(days=1)),"food":{"name":"Bubba turkey burgers","emoji":"🦃"}},
                  {"quantity":1,"unit":"pack","location":"pantry","status":"in_stock","last_purchased_on":iso(today-dt.timedelta(days=1)),"food":{"name":"Hamburger buns","emoji":"🍞"}}],
 "v_can_make": [{"recipe_id":8,"name":"Turkey burgers","emoji":"🦃","have":2,"required":2,"missing":None},{"recipe_id":7,"name":"Cheeseburgers","emoji":"🍔","have":1,"required":3,"missing":"Ground beef 80/20, American cheese slices"},{"recipe_id":6,"name":"Bagel & cream cheese","emoji":"🥯","have":0,"required":2,"missing":"Bagels, Cream cheese"}],
 "grocery_trips": [{"code":"GT-00001","store":None,"trip_date":iso(today-dt.timedelta(days=1)),"total_cents":None,"transaction_id":None,"source":"chat","grocery_trip_items":[{"count":2}]}],
 "subscriptions": [{"id":1,"name":"Microsoft Xbox","amount_cents":2437,"cadence":"monthly","next_charge_on":iso(today+dt.timedelta(days=29)),"status":"active","detected":True},
                   {"id":2,"name":"Claude subscription","amount_cents":2000,"cadence":"monthly","next_charge_on":"2026-11-04","status":"active","detected":False},
                   {"id":3,"name":"Planet Fitness","amount_cents":1500,"cadence":"monthly","next_charge_on":"2026-11-18","status":"active","detected":True},
                   {"id":4,"name":"Checking account service fee","amount_cents":1000,"cadence":"monthly","next_charge_on":"2026-11-04","status":"active","detected":True}],
 "vehicles": [{"id":1,"name":"Jetta","make":"Volkswagen","model":"Jetta","year":2014,"odometer_miles":None}],
 "vehicle_services": [], "fuel_logs": [], "documents": [{"id":11,"name":"Massachusetts registration","kind":"registration","issuer":"Massachusetts RMV","issued_on":"2025-12-01","expires_on":"2026-12-01","number_last4":"4417","tags":["Car","IDs"],"file_path":"2026/a.jpg","mime_type":"image/jpeg","file_size":1000,"created_at":ts(today)}],
 "people": [{"id":1,"name":"Hannah","relationship":"Girlfriend","birthday":None,"last_seen_on":None,"gift_ideas":None}],
 "wardrobe_items": [{"id":1,"name":"Gray hoodie","category":"top","color":"gray","brand":None,"size":"M","laundry_status":"clean","wears_since_wash":1,"wears_before_wash":3,"retired":False},
                    {"id":2,"name":"Black jeans","category":"bottom","color":"black","brand":"Levi's","size":"32x32","laundry_status":"worn","wears_since_wash":1,"wears_before_wash":1,"retired":False}],
 "v_clarifications": [{"kind":"place","ref_id":1,"title":"Evans Way, Boston","detail":"Today 1:18 PM · 2 h 5 m","priority":2,"occurred_on":iso(today)}]+[{"kind":"place","ref_id":i,"title":"Unnamed stop","detail":"weekday 8:24 AM","priority":2,"occurred_on":iso(today-dt.timedelta(days=i))} for i in range(2,6)]+[{"kind":"transaction","ref_id":7,"title":"Isabella Stewart Gardn $30.00","detail":"no category","priority":1,"occurred_on":iso(today)},{"kind":"transaction","ref_id":8,"title":"Haribo of America $17.96","detail":"no category","priority":1,"occurred_on":iso(today)},{"kind":"todo","ref_id":9,"title":"The","detail":"overdue","priority":3,"occurred_on":iso(today)}],
 "daily_activity": [{"activity_date":iso(today-dt.timedelta(days=i)),"steps":v,"active_energy_kcal":200,"resting_hr_bpm":55,"hrv_ms":40} for i,v in enumerate([4174,0,0,1299,2197,74,2955]+[2731]*23) if v],
 "sleep_nights": [{"sleep_date":iso(today-dt.timedelta(days=4)),"asleep_min":373,"deep_min":75,"rem_min":59,"core_min":239,"awake_min":20}],
 "trips": [], "courses": [], "assignments": [], "apartment_listings": [{"id":1,"title":"2BR on Cabot St","address":"Cabot St, Beverly","rent_cents":185000,"beds":2,"baths":1,"status":"saved","lat":42.548,"lon":-70.88,"commute_work_min":6,"commute_partner_min":18,"created_at":ts(today)}], "drone_flights": [], "drone_invoices": [], "drone_clients": [],
}
json.dump(fx, open('/mnt/user-data/outputs/otto-paper-wip/testkit/fixtures.json','w')); print('fixtures written:', len(fx), 'tables')
