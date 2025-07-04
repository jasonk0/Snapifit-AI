// 测试 localStorage 功能的脚本
// 在浏览器控制台中运行此脚本来诊断聊天记录问题

console.log("🔍 开始 localStorage 诊断...");

// 1. 检查 localStorage 是否可用
function testLocalStorageAvailability() {
  try {
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    console.log("✅ localStorage 可用");
    return true;
  } catch (error) {
    console.error("❌ localStorage 不可用:", error);
    return false;
  }
}

// 2. 检查聊天记录数据
function checkChatMessages() {
  try {
    const chatData = localStorage.getItem('expertChatMessages');
    console.log("📦 聊天记录原始数据:", chatData);
    
    if (!chatData) {
      console.log("ℹ️ 没有找到聊天记录数据");
      return null;
    }
    
    const parsed = JSON.parse(chatData);
    console.log("📊 聊天记录解析结果:", parsed);
    console.log("📊 专家数量:", Object.keys(parsed).length);
    
    Object.entries(parsed).forEach(([expertId, messages]) => {
      console.log(`📊 专家 ${expertId}: ${Array.isArray(messages) ? messages.length : 0} 条消息`);
    });
    
    return parsed;
  } catch (error) {
    console.error("❌ 解析聊天记录失败:", error);
    return null;
  }
}

// 3. 检查存储空间使用情况
function checkStorageUsage() {
  let totalSize = 0;
  const items = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      const size = value ? value.length : 0;
      totalSize += size;
      items[key] = {
        size: size,
        sizeKB: (size / 1024).toFixed(2)
      };
    }
  }
  
  console.log("💾 存储使用情况:");
  console.log(`总大小: ${(totalSize / 1024).toFixed(2)} KB`);
  console.log("各项详情:", items);
  
  return { totalSize, items };
}

// 4. 测试写入功能
function testWrite() {
  try {
    const testData = {
      general: [
        { id: 'test-1', role: 'user', content: '测试消息1' },
        { id: 'test-2', role: 'assistant', content: '测试回复1' }
      ]
    };
    
    localStorage.setItem('expertChatMessages', JSON.stringify(testData));
    console.log("✅ 测试写入成功");
    
    // 验证写入
    const readBack = JSON.parse(localStorage.getItem('expertChatMessages'));
    console.log("✅ 测试读取成功:", readBack);
    
    return true;
  } catch (error) {
    console.error("❌ 测试写入失败:", error);
    return false;
  }
}

// 5. 清理测试数据
function cleanupTest() {
  try {
    // 只清理测试数据，保留真实数据
    const current = localStorage.getItem('expertChatMessages');
    if (current) {
      const parsed = JSON.parse(current);
      if (parsed.general && parsed.general.length === 2 && 
          parsed.general[0].content === '测试消息1') {
        localStorage.removeItem('expertChatMessages');
        console.log("🧹 清理测试数据完成");
      }
    }
  } catch (error) {
    console.error("❌ 清理测试数据失败:", error);
  }
}

// 6. 修复损坏的数据
function repairCorruptedData() {
  try {
    const chatData = localStorage.getItem('expertChatMessages');
    if (!chatData) {
      console.log("ℹ️ 没有数据需要修复");
      return;
    }
    
    // 尝试解析
    JSON.parse(chatData);
    console.log("✅ 数据格式正常，无需修复");
  } catch (error) {
    console.warn("⚠️ 发现损坏的聊天记录数据，正在修复...");
    localStorage.removeItem('expertChatMessages');
    localStorage.setItem('expertChatMessages', JSON.stringify({}));
    console.log("✅ 已重置聊天记录数据");
  }
}

// 运行所有测试
function runDiagnostics() {
  console.log("🚀 开始完整诊断...");
  
  const isAvailable = testLocalStorageAvailability();
  if (!isAvailable) return;
  
  checkStorageUsage();
  const chatData = checkChatMessages();
  
  if (!chatData) {
    console.log("🔧 尝试测试写入功能...");
    if (testWrite()) {
      cleanupTest();
    }
  }
  
  repairCorruptedData();
  
  console.log("✅ 诊断完成");
}

// 导出函数供手动调用
window.localStorageDiagnostics = {
  runDiagnostics,
  testLocalStorageAvailability,
  checkChatMessages,
  checkStorageUsage,
  testWrite,
  cleanupTest,
  repairCorruptedData
};

// 自动运行诊断
runDiagnostics();

console.log("💡 提示: 可以通过 window.localStorageDiagnostics 访问诊断工具");
