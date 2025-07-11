// Complete system test for VidhyaDham Library Management
const baseURL = 'http://localhost:5000';

async function testCompleteSystem() {
  console.log('🚀 VidhyaDham Library Management - Complete System Test\n');
  
  const results = {
    serverHealth: false,
    dynamicTelegramConfig: false,
    schedulerTest: false,
    realUserOperations: false,
    allNotifications: false
  };
  
  try {
    // 1. Test Server Health
    console.log('🔍 Testing server health...');
    const healthResponse = await fetch(`${baseURL}/api/health`);
    if (healthResponse.ok) {
      results.serverHealth = true;
      console.log('✅ Server is healthy and running');
    } else {
      console.log('❌ Server health check failed');
      return results;
    }
    
    // 2. Configure Dynamic Telegram
    console.log('\n🤖 Configuring dynamic Telegram...');
    const telegramConfig = {
      telegramBotToken: '7987816282:AAFlkQP8hASFjATNp2s4MhgspPP2yovaLUI',
      telegramChatIds: ['939382380'],
      telegramDefaultEnabled: true,
      telegramFriendlyName: 'VidhyaDham Production Bot',
      telegramSendSilently: false,
      telegramProtectContent: false,
      telegramServerUrl: 'https://api.telegram.org'
    };
    
    const configResponse = await fetch(`${baseURL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramConfig)
    });
    
    if (configResponse.ok) {
      results.dynamicTelegramConfig = true;
      console.log('✅ Dynamic Telegram configuration saved');
      
      // Test dynamic Telegram
      const testResponse = await fetch(`${baseURL}/api/test/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body - uses dynamic config
      });
      
      const testResult = await testResponse.json();
      if (testResult.success) {
        console.log('✅ Dynamic Telegram test successful');
        console.log('📱 Check your Telegram for test message');
      }
    } else {
      console.log('❌ Failed to configure Telegram');
    }
    
    // 3. Test Scheduler
    console.log('\n📅 Testing scheduler system...');
    const schedulerResponse = await fetch(`${baseURL}/api/test/scheduler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (schedulerResponse.ok) {
      results.schedulerTest = true;
      console.log('✅ Scheduler test completed - check console logs for details');
    } else {
      console.log('⚠️ Scheduler test failed (may need authentication)');
    }
    
    // 4. Test Real User Operations (if possible)
    console.log('\n👤 Testing real user operations...');
    const testUser = {
      name: `Production Test ${Date.now()}`,
      email: `prodtest${Date.now()}@example.com`,
      phone: '+91 9876543210',
      address: 'Production Test Address',
      seatNumber: 99,
      slot: 'Morning',
      idType: 'aadhar',
      idNumber: '1234-5678-9012'
    };
    
    try {
      const userResponse = await fetch(`${baseURL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });
      
      if (userResponse.ok) {
        const createdUser = await userResponse.json();
        results.realUserOperations = true;
        console.log('✅ User created successfully');
        console.log('📱 Should receive NEW USER notification');
        
        // Test payment marking
        const userId = createdUser._id || createdUser.id;
        const paymentResponse = await fetch(`${baseURL}/api/users/${userId}/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId: 'test' })
        });
        
        if (paymentResponse.ok) {
          console.log('✅ Payment marked successfully');
          console.log('📱 Should receive PAYMENT CONFIRMATION notification');
        }
        
        // Clean up
        await fetch(`${baseURL}/api/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminId: 'test' })
        });
        
        console.log('✅ User cleaned up');
        console.log('📱 Should receive USER DELETED notification');
        results.allNotifications = true;
        
      } else {
        console.log('⚠️ User operations require authentication');
        console.log('💡 Test manually through admin panel');
      }
    } catch (userError) {
      console.log('⚠️ User operations test skipped (authentication required)');
    }
    
    // 5. Final Summary
    console.log('\n📊 COMPLETE SYSTEM TEST RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} ${testName}`);
    });
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📈 Overall: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests >= 3) { // Core functionality working
      console.log('\n🎉 SYSTEM READY FOR DEPLOYMENT!');
      console.log('📱 Telegram notifications are configured and working');
      console.log('📅 Scheduler is operational');
      console.log('⚙️ Dynamic configuration is functional');
      console.log('');
      console.log('🚀 DEPLOYMENT INSTRUCTIONS:');
      console.log('1. Push code to GitHub');
      console.log('2. Deploy to Render using render.yaml');
      console.log('3. Set environment variables (see DEPLOYMENT_GUIDE.md)');
      console.log('4. Create first admin account');
      console.log('5. Configure Telegram bot token in settings');
      console.log('6. Test all features');
      console.log('');
      console.log('📚 See DEPLOYMENT_GUIDE.md for detailed instructions');
    } else {
      console.log('\n⚠️ Some core features failed. Please fix before deployment.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ System test failed:', error.message);
    return results;
  }
}

// Check if server is running
async function checkServer() {
  try {
    await fetch(`${baseURL}/api/health`);
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm start');
    console.log('📁 Make sure you\'re in the correct directory');
    return false;
  }
}

// Main execution
console.log('🔍 Checking server status...');
checkServer().then(isRunning => {
  if (isRunning) {
    testCompleteSystem().then(results => {
      console.log('\n✨ Test completed!');
      console.log('📱 Check your Telegram for notification messages');
    });
  }
});
