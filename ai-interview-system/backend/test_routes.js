#!/usr/bin/env node

const http = require('http');

/**
 * 测试修复后的路由
 */
async function testRoutes() {
  console.log('🔍 测试修复后的路由...');
  
  const tests = [
    { path: '/health', method: 'GET', expected: 200 },
    { path: '/api/v1/auth/register', method: 'POST', expected: 200 },
    { path: '/api/v1/auth/login', method: 'POST', expected: 200 }
  ];

  for (const test of tests) {
    try {
      const result = await makeRequest(test.path, test.method, test.method === 'POST' ? { test: 'data' } : null);
      console.log(`${test.method} ${test.path} - 状态码: ${result.status} ${result.status === test.expected ? '✅' : '❌'}`);
      
      if (result.data && result.data.message) {
        console.log(`  响应: ${result.data.message}`);
      }
    } catch (error) {
      console.log(`${test.method} ${test.path} - 错误: ${error.message} ❌`);
    }
  }
}

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3003,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk.toString();
      });
      res.on('end', () => {
        try {
          const data = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: body
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 运行测试
testRoutes().then(() => {
  console.log('\n🎯 路由测试完成');
}).catch(error => {
  console.error('测试失败:', error);
});
