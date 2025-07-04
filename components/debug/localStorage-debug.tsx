"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LocalStorageDebugProps {
  className?: string;
}

export function LocalStorageDebug({ className }: LocalStorageDebugProps) {
  const [storageData, setStorageData] = useState<Record<string, any>>({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    loadStorageData();
  }, []);

  const loadStorageData = () => {
    if (typeof window === "undefined") return;

    const data: Record<string, any> = {};
    
    try {
      // 获取所有 localStorage 数据
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              data[key] = {
                raw: value,
                parsed: parsed,
                size: value.length,
                type: typeof parsed,
                isArray: Array.isArray(parsed),
                itemCount: Array.isArray(parsed) ? parsed.length : 
                          typeof parsed === 'object' && parsed !== null ? Object.keys(parsed).length : 0
              };
            }
          } catch (parseError) {
            data[key] = {
              raw: localStorage.getItem(key),
              parsed: null,
              size: localStorage.getItem(key)?.length || 0,
              type: 'string',
              error: 'JSON parse failed'
            };
          }
        }
      }
    } catch (error) {
      console.error("Failed to load localStorage data:", error);
    }

    setStorageData(data);
  };

  const clearKey = (key: string) => {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.removeItem(key);
      loadStorageData();
      console.log(`🧹 Cleared localStorage key: ${key}`);
    } catch (error) {
      console.error(`Failed to clear localStorage key ${key}:`, error);
    }
  };

  const clearAll = () => {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.clear();
      loadStorageData();
      console.log("🧹 Cleared all localStorage data");
    } catch (error) {
      console.error("Failed to clear localStorage:", error);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(storageData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `localStorage-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isClient) {
    return <div className={className}>Loading localStorage debug...</div>;
  }

  const totalSize = Object.values(storageData).reduce((sum, item) => sum + (item.size || 0), 0);
  const chatMessages = storageData['expertChatMessages'];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🔍 localStorage 调试工具</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadStorageData}>
              刷新
            </Button>
            <Button variant="outline" size="sm" onClick={exportData}>
              导出
            </Button>
            <Button variant="destructive" size="sm" onClick={clearAll}>
              清空全部
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 总览 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{Object.keys(storageData).length}</div>
            <div className="text-sm text-muted-foreground">总键数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{(totalSize / 1024).toFixed(1)}KB</div>
            <div className="text-sm text-muted-foreground">总大小</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {chatMessages ? Object.keys(chatMessages.parsed || {}).length : 0}
            </div>
            <div className="text-sm text-muted-foreground">专家数量</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {chatMessages ? 
                Object.values(chatMessages.parsed || {}).reduce((sum: number, messages: any) => 
                  sum + (Array.isArray(messages) ? messages.length : 0), 0
                ) : 0
              }
            </div>
            <div className="text-sm text-muted-foreground">总消息数</div>
          </div>
        </div>

        {/* 聊天消息详情 */}
        {chatMessages && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">💬 聊天消息详情</h3>
            <div className="space-y-2">
              {Object.entries(chatMessages.parsed || {}).map(([expertId, messages]: [string, any]) => (
                <div key={expertId} className="flex items-center justify-between">
                  <span className="font-medium">{expertId}</span>
                  <Badge variant="secondary">
                    {Array.isArray(messages) ? messages.length : 0} 条消息
                  </Badge>
                </div>
              ))}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              大小: {(chatMessages.size / 1024).toFixed(1)}KB
            </div>
          </div>
        )}

        {/* 所有键列表 */}
        <div className="space-y-2">
          <h3 className="font-semibold">📦 所有存储键</h3>
          {Object.entries(storageData).map(([key, data]) => (
            <div key={key} className="flex items-center justify-between p-2 border rounded">
              <div className="flex-1">
                <div className="font-medium">{key}</div>
                <div className="text-sm text-muted-foreground">
                  {data.type} | {(data.size / 1024).toFixed(1)}KB
                  {data.isArray && ` | ${data.itemCount} items`}
                  {data.error && ` | ❌ ${data.error}`}
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => clearKey(key)}
              >
                删除
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
