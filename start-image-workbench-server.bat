@echo off
setlocal

rem Move to this script's folder. pushd also handles UNC paths by creating a temporary drive.
pushd "%~dp0" >nul
if errorlevel 1 (
  echo Failed to enter project folder: %~dp0
  pause
  exit /b 1
)

set "PORT=4184"
if not "%IMAGE_WORKBENCH_PORT%"=="" set "PORT=%IMAGE_WORKBENCH_PORT%"

set "NODE_EXE="
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
) else if exist "C:\Users\owner\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  set "NODE_EXE=C:\Users\owner\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
) else if exist "C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  set "NODE_EXE=C:\Users\tamak\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
) else (
  set "NODE_EXE=node"
)

echo Starting image workbench server...
echo URL: http://127.0.0.1:%PORT%/image-workbench.html
echo.
echo Keep this window open while using the image workbench.
echo Press Ctrl+C to stop the server.
echo.

"%NODE_EXE%" "scripts\image-workbench-server.js"
set "EXIT_CODE=%ERRORLEVEL%"

popd >nul
echo.
echo Server stopped. Exit code: %EXIT_CODE%
pause
exit /b %EXIT_CODE%
