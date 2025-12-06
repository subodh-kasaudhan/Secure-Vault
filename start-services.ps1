Write-Host "Starting File Management System..." -ForegroundColor Green
Write-Host ""

# Start Backend
Write-Host "Starting Backend (Django API)..." -ForegroundColor Yellow
$backendJob = Start-Job -ScriptBlock {
    Set-Location "$PSScriptRoot\backend"
    python manage.py runserver 0.0.0.0:8000
}

# Wait a moment for backend to start
Start-Sleep -Seconds 5

# Start Frontend
Write-Host "Starting Frontend (React App)..." -ForegroundColor Yellow
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "$PSScriptRoot\frontend"
    npm start
}

Write-Host ""
Write-Host "Services are starting..." -ForegroundColor Green
Write-Host "Backend: http://localhost:8000" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Red

# Keep the script running and monitor services
try {
    while ($true) {
        Start-Sleep -Seconds 10
        
        # Check backend
        try {
            $backendResponse = Invoke-WebRequest -Uri "http://localhost:8000/api/files/" -UseBasicParsing -TimeoutSec 3
            Write-Host "✅ Backend: $($backendResponse.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "❌ Backend: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Check frontend
        try {
            $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 3
            Write-Host "✅ Frontend: $($frontendResponse.StatusCode)" -ForegroundColor Green
        } catch {
            Write-Host "❌ Frontend: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host "---"
    }
} catch {
    Write-Host "Stopping services..." -ForegroundColor Yellow
    Stop-Job $backendJob, $frontendJob
    Remove-Job $backendJob, $frontendJob
}
