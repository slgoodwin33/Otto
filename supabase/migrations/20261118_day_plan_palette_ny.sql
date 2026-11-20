-- Day view (TD-00116, Otto A · Screens): Otto's own category palette + v_day_plan's window from the New York date.
--
-- 1) plan_categories colors retuned to sit on Otto's near-black (#0B0C0A) next to the lime accent (#D7FF3D, kept
--    for "now" and selection): relative luminance 0.35-0.64, so dark icons read on every pill and each color reads
--    on the background (7.5:1 to 12.9:1) and on surface cards (6.9:1+). Previous values, for a revert:
--    work #2F6FDE, exercise #E5484D, school #8E4EC6, personal #30A46C, hannah #E93D82, errands #F76B15,
--    money #12A594, social #FFB224, meals #A18072, rest #8B8D98.
update plan_categories c set color = v.color
from (values ('work','#7B9CFF'), ('exercise','#FF7A6B'), ('school','#B79BFF'), ('personal','#5ED3A0'), ('hannah','#FF8CC0'),
             ('errands','#FFA766'), ('money','#4FD0D0'), ('social','#F2CF5B'), ('meals','#D2AE8A'), ('rest','#9AA1B5')) as v(key, color)
where c.key = v.key;

-- 2) v_day_plan built its 2-week window from CURRENT_DATE (UTC), so after 7 PM New York time it started a day late.
--    Same columns and rules as before; only the window's anchor and the default task color change.
create or replace view v_day_plan with (security_invoker = on) as
 WITH days AS (
         SELECT (generate_series(((((now() AT TIME ZONE 'America/New_York'::text))::date - 1))::timestamp with time zone, ((((now() AT TIME ZONE 'America/New_York'::text))::date + 13))::timestamp with time zone, '1 day'::interval))::date AS d
        )
 SELECT days.d AS plan_date,
    r.start_time,
    r.end_time,
    r.title,
    r.kind,
    'routine'::text AS source,
    r.flexible,
    NULL::text AS todo_code,
    (EXISTS ( SELECT 1
           FROM todos t
          WHERE ((t.status = 'open'::text) AND (t.scheduled_start IS NOT NULL) AND r.flexible AND (((t.scheduled_start AT TIME ZONE 'America/New_York'::text))::date = days.d) AND (((t.scheduled_start AT TIME ZONE 'America/New_York'::text))::time without time zone < r.end_time) AND (((COALESCE(t.scheduled_end, (t.scheduled_start + '00:30:00'::interval)) AT TIME ZONE 'America/New_York'::text))::time without time zone > r.start_time)))) AS displaced,
    r.category,
    c.color
   FROM ((days
     JOIN routine_blocks r ON ((r.active AND ((EXTRACT(isodow FROM days.d))::smallint = ANY (r.days)) AND ((r.valid_from IS NULL) OR (days.d >= r.valid_from)) AND ((r.valid_to IS NULL) OR (days.d <= r.valid_to)) AND (NOT (days.d = ANY (r.skip_dates))))))
     LEFT JOIN plan_categories c ON ((c.key = r.category)))
UNION ALL
 SELECT ((t.scheduled_start AT TIME ZONE 'America/New_York'::text))::date AS plan_date,
    ((t.scheduled_start AT TIME ZONE 'America/New_York'::text))::time without time zone AS start_time,
    ((COALESCE(t.scheduled_end, (t.scheduled_start + '00:30:00'::interval)) AT TIME ZONE 'America/New_York'::text))::time without time zone AS end_time,
    t.title,
    'task'::text AS kind,
    'todo'::text AS source,
    false AS flexible,
    t.code AS todo_code,
    false AS displaced,
    COALESCE(t.category, 'personal'::text) AS category,
    COALESCE(c.color, '#5ED3A0'::text) AS color
   FROM (todos t
     LEFT JOIN plan_categories c ON ((c.key = t.category)))
  WHERE ((t.status = 'open'::text) AND (t.scheduled_start IS NOT NULL));
