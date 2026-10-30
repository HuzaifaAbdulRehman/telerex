import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',timeout:20000,fullyParallel:false,workers:1,
  use:{baseURL:'http://127.0.0.1:3211',viewport:{width:1440,height:1000},
    launchOptions:process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{},
    trace:'retain-on-failure'},
  webServer:{command:'node --env-file-if-exists=.env server/index.ts',url:'http://127.0.0.1:3211',
    env:{PORT:'3211'},reuseExistingServer:false,timeout:15000}
});
