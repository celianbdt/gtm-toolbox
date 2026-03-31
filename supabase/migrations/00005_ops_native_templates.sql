-- ============================================
-- GTM Toolbox — Native Templates for Ops Engine
-- ============================================

-- 1. Funding Trigger
INSERT INTO ops_templates (workspace_id, name, description, slug, icon, is_native, columns_config, scoring_config, settings, automations_config)
VALUES (
  NULL,
  'Funding Trigger',
  'Track companies that recently raised funding in your target market',
  'funding-trigger',
  'TrendingUp',
  true,
  '[
    {"name":"Company Name","key":"company_name","column_type":"static","position":0,"config":{},"is_visible":true},
    {"name":"Domain","key":"domain","column_type":"static","position":1,"config":{},"is_visible":true},
    {"name":"Funding Round","key":"funding_round","column_type":"signal_input","position":2,"config":{"source":"crunchbase","filters":{}},"is_visible":true},
    {"name":"Funding Amount","key":"funding_amount","column_type":"static","position":3,"config":{},"is_visible":true},
    {"name":"Funding Date","key":"funding_date","column_type":"static","position":4,"config":{},"is_visible":true},
    {"name":"Investors","key":"investors","column_type":"static","position":5,"config":{},"is_visible":true},
    {"name":"Industry","key":"industry","column_type":"static","position":6,"config":{},"is_visible":true},
    {"name":"Employee Count","key":"employee_count","column_type":"enricher","position":7,"config":{"waterfall":[{"provider":"clearbit","fields":["employee_count"],"timeout_ms":10000},{"provider":"proxycurl","fields":["employee_count"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"Contact Email","key":"contact_email","column_type":"enricher","position":8,"config":{"waterfall":[{"provider":"apollo","fields":["email"],"timeout_ms":10000},{"provider":"hunter","fields":["email"],"timeout_ms":10000},{"provider":"dropcontact","fields":["email"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"Contact Name","key":"contact_name","column_type":"static","position":9,"config":{},"is_visible":true},
    {"name":"ICP Score","key":"icp_score","column_type":"ai_column","position":10,"config":{"prompt":"Based on this company''s industry: {industry}, size: {employee_count}, and funding: {funding_amount}, score ICP fit from 0-100. Consider: SaaS/tech focus, 10-500 employees, recent Series A-B preferred.","model":"claude-haiku-4-5","output_type":"number"},"is_visible":true},
    {"name":"Personalized Opener","key":"personalized_opener","column_type":"ai_column","position":11,"config":{"prompt":"Write a 2-sentence personalized cold email opener for {contact_name} at {company_name}. Reference their recent {funding_round} of {funding_amount}. Be specific and human.","model":"claude-haiku-4-5","output_type":"text"},"is_visible":true}
  ]'::jsonb,
  '{
    "rules": [
      {"id":"funding-amount-high","label":"Funding amount > 1M","column_key":"funding_amount","operator":"greater_than","value":1000000,"score_impact":20},
      {"id":"industry-target","label":"Industry matches target list","column_key":"industry","operator":"matches_list","value":["SaaS","Fintech","AI","Tech"],"score_impact":15},
      {"id":"employee-sweet-spot","label":"Employee count 10-500","column_key":"employee_count","operator":"greater_than","value":10,"score_impact":10},
      {"id":"funding-recent","label":"Funding within 90 days","column_key":"funding_date","operator":"within_days","value":90,"score_impact":25}
    ],
    "thresholds": {"ignored":0,"cold":15,"warm":35,"hot":55,"priority":75}
  }'::jsonb,
  '{"enrichment_threshold":30,"daily_signal_limit":50,"auto_enrich":true}'::jsonb,
  '[
    {"name":"Slack alert on priority leads","automation_type":"slack_webhook","trigger_tier":"priority","config":{},"is_active":false},
    {"name":"Push hot leads to CRM","automation_type":"hubspot_push","trigger_tier":"hot","config":{},"is_active":false}
  ]'::jsonb
);

-- 2. Hiring Intent
INSERT INTO ops_templates (workspace_id, name, description, slug, icon, is_native, columns_config, scoring_config, settings, automations_config)
VALUES (
  NULL,
  'Hiring Intent',
  'Detect companies hiring for roles that signal buying intent',
  'hiring-intent',
  'UserPlus',
  true,
  '[
    {"name":"Company Name","key":"company_name","column_type":"static","position":0,"config":{},"is_visible":true},
    {"name":"Domain","key":"domain","column_type":"static","position":1,"config":{},"is_visible":true},
    {"name":"Job Title","key":"job_title","column_type":"signal_input","position":2,"config":{"source":"linkedin_jobs","filters":{}},"is_visible":true},
    {"name":"Job Department","key":"job_department","column_type":"static","position":3,"config":{},"is_visible":true},
    {"name":"Posted Date","key":"posted_date","column_type":"static","position":4,"config":{},"is_visible":true},
    {"name":"Employee Count","key":"employee_count","column_type":"enricher","position":5,"config":{"waterfall":[{"provider":"clearbit","fields":["employee_count"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"Contact Email","key":"contact_email","column_type":"enricher","position":6,"config":{"waterfall":[{"provider":"apollo","fields":["email"],"timeout_ms":10000},{"provider":"icypeas","fields":["email"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"ICP Score","key":"icp_score","column_type":"ai_column","position":7,"config":{"prompt":"Based on this company''s hiring for {job_title} in {job_department}, with {employee_count} employees, score ICP fit from 0-100. Hiring in Sales/Marketing/Growth signals buying intent.","model":"claude-haiku-4-5","output_type":"number"},"is_visible":true}
  ]'::jsonb,
  '{
    "rules": [
      {"id":"dept-buying-signal","label":"Department matches buying signal","column_key":"job_department","operator":"matches_list","value":["Sales","Marketing","Growth","Revenue"],"score_impact":20},
      {"id":"company-size-min","label":"Employee count > 20","column_key":"employee_count","operator":"greater_than","value":20,"score_impact":10},
      {"id":"job-recent","label":"Posted within 30 days","column_key":"posted_date","operator":"within_days","value":30,"score_impact":15}
    ],
    "thresholds": {"ignored":0,"cold":10,"warm":25,"hot":40,"priority":60}
  }'::jsonb,
  '{"enrichment_threshold":25,"daily_signal_limit":100,"auto_enrich":true}'::jsonb,
  '[
    {"name":"Slack alert on priority leads","automation_type":"slack_webhook","trigger_tier":"priority","config":{},"is_active":false}
  ]'::jsonb
);

-- 3. Champion Change
INSERT INTO ops_templates (workspace_id, name, description, slug, icon, is_native, columns_config, scoring_config, settings, automations_config)
VALUES (
  NULL,
  'Champion Change',
  'Track when decision-makers change companies — warm intro opportunities',
  'champion-change',
  'ArrowRightLeft',
  true,
  '[
    {"name":"Contact Name","key":"contact_name","column_type":"static","position":0,"config":{},"is_visible":true},
    {"name":"Previous Company","key":"previous_company","column_type":"static","position":1,"config":{},"is_visible":true},
    {"name":"New Company","key":"new_company","column_type":"static","position":2,"config":{},"is_visible":true},
    {"name":"New Title","key":"new_title","column_type":"static","position":3,"config":{},"is_visible":true},
    {"name":"LinkedIn URL","key":"linkedin_url","column_type":"signal_input","position":4,"config":{"source":"proxycurl","filters":{}},"is_visible":true},
    {"name":"Contact Email","key":"contact_email","column_type":"enricher","position":5,"config":{"waterfall":[{"provider":"apollo","fields":["email"],"timeout_ms":10000},{"provider":"fullenrich","fields":["email"],"timeout_ms":15000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"Company Size","key":"company_size","column_type":"enricher","position":6,"config":{"waterfall":[{"provider":"clearbit","fields":["employee_count"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"ICP Score","key":"icp_score","column_type":"ai_column","position":7,"config":{"prompt":"Score this champion change opportunity 0-100. {contact_name} moved from {previous_company} to {new_company} as {new_title}. Consider seniority, company fit, and warm intro potential.","model":"claude-haiku-4-5","output_type":"number"},"is_visible":true}
  ]'::jsonb,
  '{
    "rules": [
      {"id":"title-head","label":"New title contains Head","column_key":"new_title","operator":"contains","value":"Head","score_impact":15},
      {"id":"title-vp","label":"New title contains VP","column_key":"new_title","operator":"contains","value":"VP","score_impact":20},
      {"id":"title-director","label":"New title contains Director","column_key":"new_title","operator":"contains","value":"Director","score_impact":15}
    ],
    "thresholds": {"ignored":0,"cold":10,"warm":20,"hot":35,"priority":50}
  }'::jsonb,
  '{"enrichment_threshold":20,"daily_signal_limit":50,"auto_enrich":true}'::jsonb,
  '[
    {"name":"Slack alert on VP+ moves","automation_type":"slack_webhook","trigger_tier":"hot","config":{},"is_active":false}
  ]'::jsonb
);

-- 4. Web Intent
INSERT INTO ops_templates (workspace_id, name, description, slug, icon, is_native, columns_config, scoring_config, settings, automations_config)
VALUES (
  NULL,
  'Web Intent',
  'Identify anonymous website visitors and score buying intent',
  'web-intent',
  'Eye',
  true,
  '[
    {"name":"Company Name","key":"company_name","column_type":"static","position":0,"config":{},"is_visible":true},
    {"name":"Domain","key":"domain","column_type":"static","position":1,"config":{},"is_visible":true},
    {"name":"Pages Visited","key":"pages_visited","column_type":"signal_input","position":2,"config":{"source":"snitcher","filters":{}},"is_visible":true},
    {"name":"Visit Count","key":"visit_count","column_type":"static","position":3,"config":{},"is_visible":true},
    {"name":"Last Visit","key":"last_visit","column_type":"static","position":4,"config":{},"is_visible":true},
    {"name":"Referrer","key":"referrer","column_type":"static","position":5,"config":{},"is_visible":true},
    {"name":"Contact Email","key":"contact_email","column_type":"enricher","position":6,"config":{"waterfall":[{"provider":"apollo","fields":["email"],"timeout_ms":10000},{"provider":"hunter","fields":["email"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"ICP Score","key":"icp_score","column_type":"ai_column","position":7,"config":{"prompt":"Score buying intent 0-100 for {company_name} ({domain}). They visited: {pages_visited} ({visit_count} times). Referrer: {referrer}. Pricing page visits and repeat visits signal high intent.","model":"claude-haiku-4-5","output_type":"number"},"is_visible":true}
  ]'::jsonb,
  '{
    "rules": [
      {"id":"visit-count-high","label":"Visit count > 3","column_key":"visit_count","operator":"greater_than","value":3,"score_impact":25},
      {"id":"pricing-page","label":"Visited pricing page","column_key":"pages_visited","operator":"contains","value":"pricing","score_impact":30},
      {"id":"google-referrer","label":"Referred from Google","column_key":"referrer","operator":"contains","value":"google","score_impact":5}
    ],
    "thresholds": {"ignored":0,"cold":10,"warm":25,"hot":45,"priority":65}
  }'::jsonb,
  '{"enrichment_threshold":20,"daily_signal_limit":200,"auto_enrich":true}'::jsonb,
  '[
    {"name":"Slack alert on high-intent visitors","automation_type":"slack_webhook","trigger_tier":"hot","config":{},"is_active":false},
    {"name":"Push priority to outbound sequence","automation_type":"instantly_push","trigger_tier":"priority","config":{},"is_active":false}
  ]'::jsonb
);

-- 5. ICP Discovery
INSERT INTO ops_templates (workspace_id, name, description, slug, icon, is_native, columns_config, scoring_config, settings, automations_config)
VALUES (
  NULL,
  'ICP Discovery',
  'Explore a new market segment and find matching companies',
  'icp-discovery',
  'Search',
  true,
  '[
    {"name":"Company Name","key":"company_name","column_type":"static","position":0,"config":{},"is_visible":true},
    {"name":"Domain","key":"domain","column_type":"static","position":1,"config":{},"is_visible":true},
    {"name":"Industry","key":"industry","column_type":"static","position":2,"config":{},"is_visible":true},
    {"name":"Employee Count","key":"employee_count","column_type":"enricher","position":3,"config":{"waterfall":[{"provider":"clearbit","fields":["employee_count"],"timeout_ms":10000},{"provider":"proxycurl","fields":["employee_count"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"Revenue Range","key":"revenue_range","column_type":"enricher","position":4,"config":{"waterfall":[{"provider":"clearbit","fields":["revenue_range"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"Tech Stack","key":"tech_stack","column_type":"enricher","position":5,"config":{"waterfall":[{"provider":"builtwith","fields":["technologies"],"timeout_ms":15000},{"provider":"wappalyzer","fields":["technologies"],"timeout_ms":15000}],"cache_ttl_days":60},"is_visible":true},
    {"name":"Contact Email","key":"contact_email","column_type":"enricher","position":6,"config":{"waterfall":[{"provider":"apollo","fields":["email"],"timeout_ms":10000},{"provider":"datagma","fields":["email"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"ICP Score","key":"icp_score","column_type":"ai_column","position":7,"config":{"prompt":"Score ICP fit 0-100 for {company_name} in {industry} with {employee_count} employees, revenue {revenue_range}, using tech: {tech_stack}. Evaluate fit against typical B2B SaaS ICP criteria.","model":"claude-haiku-4-5","output_type":"number"},"is_visible":true}
  ]'::jsonb,
  '{
    "rules": [
      {"id":"industry-match","label":"Industry matches target","column_key":"industry","operator":"matches_list","value":["SaaS","Fintech","AI","Tech","MarTech","AdTech"],"score_impact":20},
      {"id":"employee-range","label":"Employee count in range","column_key":"employee_count","operator":"greater_than","value":10,"score_impact":15},
      {"id":"tech-stack-match","label":"Tech stack contains target tech","column_key":"tech_stack","operator":"contains","value":"","score_impact":10}
    ],
    "thresholds": {"ignored":0,"cold":10,"warm":25,"hot":40,"priority":60}
  }'::jsonb,
  '{"enrichment_threshold":20,"daily_signal_limit":100,"auto_enrich":true}'::jsonb,
  '[
    {"name":"Weekly email digest","automation_type":"email_digest","trigger_tier":"warm","config":{},"is_active":false}
  ]'::jsonb
);

-- 6. CRM Enrichment
INSERT INTO ops_templates (workspace_id, name, description, slug, icon, is_native, columns_config, scoring_config, settings, automations_config)
VALUES (
  NULL,
  'CRM Enrichment',
  'Enrich your existing CRM contacts with fresh data',
  'crm-enrichment',
  'RefreshCw',
  true,
  '[
    {"name":"Company Name","key":"company_name","column_type":"static","position":0,"config":{},"is_visible":true},
    {"name":"Domain","key":"domain","column_type":"static","position":1,"config":{},"is_visible":true},
    {"name":"Existing Email","key":"existing_email","column_type":"static","position":2,"config":{},"is_visible":true},
    {"name":"Enriched Email","key":"enriched_email","column_type":"enricher","position":3,"config":{"waterfall":[{"provider":"apollo","fields":["email"],"timeout_ms":10000},{"provider":"hunter","fields":["email"],"timeout_ms":10000},{"provider":"dropcontact","fields":["email"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"Enriched Phone","key":"enriched_phone","column_type":"enricher","position":4,"config":{"waterfall":[{"provider":"apollo","fields":["phone"],"timeout_ms":10000},{"provider":"datagma","fields":["phone"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"LinkedIn URL","key":"linkedin_url","column_type":"enricher","position":5,"config":{"waterfall":[{"provider":"proxycurl","fields":["linkedin_url"],"timeout_ms":10000}],"cache_ttl_days":60},"is_visible":true},
    {"name":"Company Description","key":"company_description","column_type":"enricher","position":6,"config":{"waterfall":[{"provider":"clearbit","fields":["description"],"timeout_ms":10000}],"cache_ttl_days":60},"is_visible":true},
    {"name":"Tech Stack","key":"tech_stack","column_type":"enricher","position":7,"config":{"waterfall":[{"provider":"builtwith","fields":["technologies"],"timeout_ms":15000}],"cache_ttl_days":60},"is_visible":true},
    {"name":"ICP Score","key":"icp_score","column_type":"ai_column","position":8,"config":{"prompt":"Score enrichment completeness and ICP fit 0-100 for {company_name}. Data available: email={enriched_email}, phone={enriched_phone}, linkedin={linkedin_url}, tech={tech_stack}. Higher score = more complete data + better fit.","model":"claude-haiku-4-5","output_type":"number"},"is_visible":true}
  ]'::jsonb,
  '{
    "rules": [
      {"id":"email-found","label":"Enriched email found","column_key":"enriched_email","operator":"is_not_empty","value":"","score_impact":10},
      {"id":"phone-found","label":"Enriched phone found","column_key":"enriched_phone","operator":"is_not_empty","value":"","score_impact":10},
      {"id":"tech-stack-found","label":"Tech stack found","column_key":"tech_stack","operator":"is_not_empty","value":"","score_impact":5}
    ],
    "thresholds": {"ignored":0,"cold":5,"warm":15,"hot":25,"priority":35}
  }'::jsonb,
  '{"enrichment_threshold":0,"daily_signal_limit":500,"auto_enrich":true}'::jsonb,
  '[
    {"name":"Push enriched contacts to HubSpot","automation_type":"hubspot_push","trigger_tier":"warm","config":{},"is_active":false}
  ]'::jsonb
);

-- 7. Event Leads
INSERT INTO ops_templates (workspace_id, name, description, slug, icon, is_native, columns_config, scoring_config, settings, automations_config)
VALUES (
  NULL,
  'Event Leads',
  'Process and enrich lists of event attendees',
  'event-leads',
  'CalendarDays',
  true,
  '[
    {"name":"Contact Name","key":"contact_name","column_type":"static","position":0,"config":{},"is_visible":true},
    {"name":"Email","key":"email","column_type":"static","position":1,"config":{},"is_visible":true},
    {"name":"Company Name","key":"company_name","column_type":"static","position":2,"config":{},"is_visible":true},
    {"name":"Domain","key":"domain","column_type":"static","position":3,"config":{},"is_visible":true},
    {"name":"Event Name","key":"event_name","column_type":"static","position":4,"config":{},"is_visible":true},
    {"name":"Enriched Phone","key":"enriched_phone","column_type":"enricher","position":5,"config":{"waterfall":[{"provider":"apollo","fields":["phone"],"timeout_ms":10000},{"provider":"dropcontact","fields":["phone"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"LinkedIn URL","key":"linkedin_url","column_type":"enricher","position":6,"config":{"waterfall":[{"provider":"proxycurl","fields":["linkedin_url"],"timeout_ms":10000}],"cache_ttl_days":60},"is_visible":true},
    {"name":"Company Size","key":"company_size","column_type":"enricher","position":7,"config":{"waterfall":[{"provider":"clearbit","fields":["employee_count"],"timeout_ms":10000}],"cache_ttl_days":30},"is_visible":true},
    {"name":"ICP Score","key":"icp_score","column_type":"ai_column","position":8,"config":{"prompt":"Score this event lead 0-100. {contact_name} from {company_name} (size: {company_size}) attended {event_name}. Consider company size, role relevance, and event context.","model":"claude-haiku-4-5","output_type":"number"},"is_visible":true}
  ]'::jsonb,
  '{
    "rules": [
      {"id":"company-size-min","label":"Company size > 10","column_key":"company_size","operator":"greater_than","value":10,"score_impact":10},
      {"id":"email-present","label":"Email provided","column_key":"email","operator":"is_not_empty","value":"","score_impact":15}
    ],
    "thresholds": {"ignored":0,"cold":5,"warm":15,"hot":25,"priority":40}
  }'::jsonb,
  '{"enrichment_threshold":10,"daily_signal_limit":500,"auto_enrich":true}'::jsonb,
  '[
    {"name":"Push to outbound sequence","automation_type":"lemlist_push","trigger_tier":"warm","config":{},"is_active":false}
  ]'::jsonb
);
