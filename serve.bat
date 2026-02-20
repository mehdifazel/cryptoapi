@echo off
echo Starting HTTP server...
echo Open http://localhost:8080 in your browser
echo Press Ctrl+C to stop
echo.
python -m http.server 8080
if errorlevel 1 (
  echo.
  echo Python not found. Install Python or use: php -S localhost:8080
  pause
)
