# Test data in the shapes the app's real queries return (keep columns identical to the real selects).
import json, os, sys, datetime as dt
from zoneinfo import ZoneInfo
tz = ZoneInfo('America/New_York'); now = dt.datetime.now(tz)
today = dt.date.fromisoformat(os.environ['OTTO_TODAY']) if os.environ.get('OTTO_TODAY') else now.date()
iso = lambda d: d.isoformat()
ts = lambda d, h=12, m=0: dt.datetime(d.year, d.month, d.day, h, m, tzinfo=tz).astimezone(dt.timezone.utc).isoformat()
week_start = today - dt.timedelta(days=(today.weekday()))
fx = {
 "accounts": [{"id":3,"code":"AC-00003","name":"Primary Checking (...9292)","account_type":"checking","institution":"Mascoma Bank","status":"active","current_balance_cents":330011,"available_balance_cents":360011,"balance_updated_at":ts(today,7),"rewards":[],"snapshots":[]},
              {"id":2,"code":"AC-00002","name":"Discover It (...5117)","account_type":"credit card","institution":"Discover","status":"active","current_balance_cents":51275,"credit_limit_cents":250000,"balance_updated_at":ts(today,7),"rewards":[],"snapshots":[]}],
 "v_weekly_summary": [{"period_code":"BP-00004","week_start":iso(week_start),"week_end":iso(week_start+dt.timedelta(days=6)),"status":"open","planned_cents":82525,"spent_cents":31244,"remaining_cents":51281,"expected_income_cents":82525}],
 "v_weekly_budget": [], "recurring_bills": [{"code":"RB-00001","name":"Rent","amount_cents":50000,"frequency":"monthly","due_day":1,"autopay":False,"category":None},{"code":"RB-00005","name":"Claude subscription","amount_cents":2000,"frequency":"monthly","due_day":4,"autopay":True,"category":None}],
 "todos": [dict(t, **{"scheduled_start":None,"scheduled_end":None,"category":None,"project_id":None,"asset_id":None,"domain_tag":None,"claimed_by":None,"claimed_at":None}) for t in [
   {"code":"TD-00030","title":"Finish Salem State application","status":"open","due_date":iso(today-dt.timedelta(days=6)),"priority":"high","project":None,"asset":None,"notes":None,"created_at":ts(today-dt.timedelta(days=20)),"someday":False,"reviewed_at":None,"completed_at":None},
   {"code":"TD-00027","title":"Contact a Salem State advisor","status":"open","due_date":None,"priority":"medium","project":None,"asset":None,"notes":None,"created_at":ts(today-dt.timedelta(days=40)),"someday":False,"reviewed_at":None,"completed_at":None},
   {"code":"TD-00041","title":"Email the landlord about the radiator","status":"open","due_date":iso(today),"priority":"medium","project":None,"asset":None,"notes":None,"created_at":ts(today-dt.timedelta(days=2)),"someday":False,"reviewed_at":None,"completed_at":None}]] + [
   {"code":"TD-00050","title":"Call the bank about the card","status":"open","due_date":iso(today),"priority":"high","project":None,"asset":None,"notes":None,"created_at":ts(today-dt.timedelta(days=1)),"someday":False,"reviewed_at":None,"completed_at":None,"scheduled_start":ts(today,12,15),"scheduled_end":ts(today,12,35),"category":"money","project_id":None,"asset_id":None,"domain_tag":None,"claimed_by":None,"claimed_at":None},
   {"code":"TD-00051","title":"Pick up dry cleaning","status":"open","due_date":iso(today),"priority":"low","project":None,"asset":None,"notes":None,"created_at":ts(today-dt.timedelta(days=1)),"someday":False,"reviewed_at":None,"completed_at":None,"scheduled_start":ts(today,16,45),"scheduled_end":ts(today,17,15),"category":"errands","project_id":None,"asset_id":None,"domain_tag":None,"claimed_by":None,"claimed_at":None},
   {"code":"TD-00052","title":"Stretch 10 minutes","status":"done","due_date":iso(today),"priority":None,"project":None,"asset":None,"notes":None,"created_at":ts(today-dt.timedelta(days=1)),"someday":False,"reviewed_at":None,"completed_at":ts(today,7,0),"scheduled_start":ts(today,7,50),"scheduled_end":ts(today,8,0),"category":"exercise","project_id":None,"asset_id":None,"domain_tag":None,"claimed_by":None,"claimed_at":None},
   {"code":"TD-00053","title":"Study for the GIS exam","status":"open","due_date":iso(today+dt.timedelta(days=1)),"priority":"medium","project":None,"asset":None,"notes":None,"created_at":ts(today-dt.timedelta(days=1)),"someday":False,"reviewed_at":None,"completed_at":None,"scheduled_start":ts(today+dt.timedelta(days=1),19,0),"scheduled_end":ts(today+dt.timedelta(days=1),20,0),"category":"school","project_id":None,"asset_id":None,"domain_tag":None,"claimed_by":None,"claimed_at":None}],
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

# ---- day plan (.104): plan_categories, routine_blocks, v_day_plan (same rules as the view) ----
cats = [("work","Work","#7B9CFF","Work",1),("exercise","Exercise","#FF7A6B","Exercise",2),("school","School","#B79BFF","School",3),("personal","Personal","#5ED3A0","Personal",4),
        ("partner","Partner","#FF8CC0",None,5),("errands","Errands & car","#FFA766",None,6),("money","Money & admin","#4FD0D0",None,7),("social","Friends & family","#F2CF5B",None,8),
        ("meals","Meals","#D2AE8A",None,9),("rest","Sleep & downtime","#9AA1B5",None,10)]
fx["plan_categories"] = [dict(key=k,label=l,color=c,phone_calendar=pc,sort=o) for k,l,c,pc,o in cats]
R = [  # title, kind, category, start, end, isodows, flexible
 ("Sleep","sleep","rest","22:30","06:00",[1,2,3,4,5,6,7],False),("Wake up, get ready","routine","rest","06:00","06:30",[1,2,3,4,5],False),
 ("Gym, shower there","gym","exercise","06:30","07:45",[1,2,3,5],False),("Breakfast + commute","commute","work","07:45","08:30",[1,2,3,4,5],False),
 ("Work","work","work","08:30","12:00",[1,2,3,4,5],False),("Lunch break","meal","meals","12:00","13:00",[1,2,3,4,5],True),
 ("Work","work","work","13:00","16:30",[1,2,3,4,5],False),("Errands / tasks","errands","errands","16:30","17:30",[1,2,3,4,5],True),
 ("Dinner","meal","meals","17:30","18:30",[1,2,3,4,5],True),("Free time","free","rest","18:30","22:00",[1,2,3,4,5],True),("Wind down","routine","rest","22:00","22:30",[1,2,3,4,5,7],False),
 ("Slow morning + breakfast","routine","rest","08:00","09:30",[6,7],True),("Weekend gym or hike","gym","exercise","09:30","11:30",[6,7],True),
 ("Groceries + meal prep","chores","errands","12:00","14:00",[7],True),("Weekly reset: plan week, budget","admin","money","19:00","20:00",[7],False),("Free day","free","rest","12:00","22:00",[6],True)]
fx["routine_blocks"] = [dict(id=i+1,title=t,kind=k,category=c,start_time=a+":00",end_time=b+":00",days=d,flexible=f,active=True,valid_from=None,valid_to=None,skip_dates=[],notes=None,created_at=ts(today-dt.timedelta(days=3))) for i,(t,k,c,a,b,d,f) in enumerate(R)]
color = {c["key"]: c["color"] for c in fx["plan_categories"]}
vdp = []
for n in range(-1, 14):
    d = today + dt.timedelta(days=n)
    for r in fx["routine_blocks"]:
        if d.isoweekday() in r["days"]:
            vdp.append(dict(plan_date=iso(d), start_time=r["start_time"], end_time=r["end_time"], title=r["title"], kind=r["kind"], source="routine", flexible=r["flexible"], todo_code=None, displaced=False, category=r["category"], color=color.get(r["category"])))
for t in fx["todos"]:
    if t["status"] == "open" and t.get("scheduled_start"):
        s0 = dt.datetime.fromisoformat(t["scheduled_start"]).astimezone(tz); e0 = dt.datetime.fromisoformat(t["scheduled_end"]).astimezone(tz)
        vdp.append(dict(plan_date=iso(s0.date()), start_time=s0.strftime("%H:%M:00"), end_time=e0.strftime("%H:%M:00"), title=t["title"], kind="task", source="todo", flexible=False, todo_code=t["code"], displaced=False, category=t["category"] or "personal", color=color.get(t["category"] or "personal")))
fx["v_day_plan"] = vdp

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fixtures.json')
json.dump(fx, open(out,'w')); print('fixtures written:', len(fx), 'tables')
