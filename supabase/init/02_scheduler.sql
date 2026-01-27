-- Function to trigger the daily fetch via HTTP
CREATE OR REPLACE FUNCTION trigger_daily_fetch()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Call FastAPI's fetch trigger endpoint
    PERFORM net.http_post(
        url := 'http://backend:8000/api/fetch/trigger',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    );
END;
$$;

-- Schedule daily at 12:00 UTC (7:00 AM EST / 8:00 AM EDT)
SELECT cron.schedule(
    'daily-news-fetch',
    '0 12 * * *',
    'SELECT trigger_daily_fetch()'
);
