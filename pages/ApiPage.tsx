
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService.ts';
import { ApiKeyInfo, ApiKeyCreateResp } from '../types.ts';
import { PixelButton, PixelCard } from '../components/PixelComponents.tsx';
import { Trash2, Plus, AlertTriangle, Copy, Check } from 'lucide-react';

interface ApiPageProps {
  lang?: 'en' | 'zh';
}

const ApiPage: React.FC<ApiPageProps> = ({ lang = 'en' }) => {
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResp | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isZh = lang === 'zh';
  const zhScale = (enSize: number) => isZh ? `${enSize + 3}px` : `${enSize}px`;

  const fetchApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiService.listApiKeys();
      setApiKeys(res.api_keys || []);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setIsCreating(true);
    try {
      const res = await apiService.createApiKey(newKeyName);
      setCreatedKey(res);
      setShowCreateModal(false);
      setNewKeyName('');
      fetchApiKeys();
    } catch (err: any) {
      alert(isZh ? `创建失败: ${err.message}` : `Creation failed: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    setIsDeleting(true);
    try {
      await apiService.deleteApiKey(id);
      setApiKeys(prev => prev.map(k => k.id === id ? { ...k, is_active: false } : k));
      setShowDeleteConfirm(null);
    } catch (err: any) {
      alert(isZh ? `删除失败: ${err.message}` : `Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 text-white max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className={`font-bold uppercase text-white/80 ${isZh ? 'text-[24px]' : 'text-xl'}`}>
          {isZh ? 'API 密钥' : 'API KEYS'}
        </h2>
        <PixelButton variant="secondary" onClick={fetchApiKeys} style={{ fontSize: zhScale(10) }}>
          {isZh ? '刷新' : 'Refresh'}
        </PixelButton>
      </div>

      <PixelCard className="relative">
        <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 animate-pulse uppercase text-white/50" style={{ fontSize: zhScale(10) }}>
              {isZh ? '正在获取密钥...' : 'Fetching keys...'}
            </div>
          ) : error ? (
            <div className="text-center py-10 space-y-4">
              <p className="text-red-500 uppercase" style={{ fontSize: zhScale(10) }}>{error}</p>
              <PixelButton onClick={fetchApiKeys} style={{ fontSize: zhScale(10) }}>
                {isZh ? '重试' : 'Retry'}
              </PixelButton>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-10 opacity-50 uppercase" style={{ fontSize: zhScale(10) }}>
              {isZh ? '暂无 API 密钥' : 'No API keys found'}
            </div>
          ) : (
            apiKeys.map((key) => (
              <div 
                key={key.id} 
                onClick={() => key.is_active && setShowDeleteConfirm(key.id)}
                className={`p-4 bg-black/20 pixel-border border-[#5a2d9c] flex items-center justify-between group transition-all ${key.is_active ? 'hover:bg-white/5 cursor-pointer' : 'opacity-50'}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white/90" style={{ fontSize: 14 }}>{key.name || 'Unnamed Key'}</span>
                    <span className={`text-[8px] px-1 border ${key.is_active ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                      {key.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-white/40 text-[10px]">
                    <span>{key.key_prefix}******</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[8px] text-white/40 uppercase">{isZh ? '创建时间' : 'Created At'}</p>
                    <p className="text-[10px] text-white/60">{key.created_at ? new Date(key.created_at).toLocaleDateString() : '-'}</p>
                  </div>
                  
                  {key.is_active && (
                    <div className="p-2 text-red-500/40 group-hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-center">
          <PixelButton 
            variant="primary" 
            className="flex items-center gap-2" 
            onClick={() => setShowCreateModal(true)}
            style={{ fontSize: zhScale(10) }}
          >
            <Plus size={16} />
            {isZh ? '创建新密钥' : 'CREATE NEW KEY'}
          </PixelButton>
        </div>
      </PixelCard>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <PixelCard className="max-w-md w-full p-6 space-y-6" title={isZh ? '创建 API 密钥' : 'CREATE API KEY'}>
            <div className="space-y-4">
              <p className="text-white/60" style={{ fontSize: zhScale(10) }}>
                {isZh ? '请输入密钥名称以便识别：' : 'Give your key a name to identify it:'}
              </p>
              <input 
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={isZh ? '例如：开发环境' : 'e.g. Development'}
                className="w-full bg-black/40 border-2 border-[#5a2d9c] p-3 text-white outline-none focus:border-[#f7d51d] transition-colors font-bold"
                autoFocus
              />
            </div>
            <div className="flex gap-4">
              <PixelButton 
                variant="primary" 
                className="flex-1" 
                onClick={handleCreateKey}
                disabled={isCreating || !newKeyName.trim()}
                style={{ fontSize: zhScale(10) }}
              >
                {isCreating ? (isZh ? '创建中...' : 'CREATING...') : (isZh ? '确认创建' : 'CREATE')}
              </PixelButton>
              <PixelButton 
                variant="secondary" 
                className="flex-1" 
                onClick={() => { setShowCreateModal(false); setNewKeyName(''); }}
                style={{ fontSize: zhScale(10) }}
              >
                {isZh ? '取消' : 'CANCEL'}
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}

      {/* Show Secret Modal */}
      {createdKey && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
          <PixelCard className="max-w-lg w-full p-8 space-y-6 border-[#f7d51d]" title={isZh ? '密钥已创建' : 'KEY CREATED'}>
            <div className="bg-yellow-500/10 border-2 border-yellow-500/30 p-4 flex gap-4 items-start">
              <AlertTriangle className="text-yellow-500 shrink-0" size={24} />
              <div className="space-y-2">
                <p className="font-bold text-yellow-500" style={{ fontSize: zhScale(10) }}>
                  {isZh ? '请立即复制并保存此密钥！' : 'COPY AND SAVE THIS KEY NOW!'}
                </p>
                <p className="text-white/60 text-[10px]">
                  {isZh ? '出于安全考虑，此密钥只会显示一次。如果您丢失了它，您将需要创建一个新密钥。' : 'For security reasons, this key will only be shown once. If you lose it, you will need to create a new one.'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-white/40 uppercase text-[8px]">{isZh ? 'API 密钥' : 'API KEY'}</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-black/60 p-4 font-mono text-[#f7d51d] break-all border-2 border-[#5a2d9c]">
                  {createdKey.api_key}
                </div>
                <button 
                  onClick={() => copyToClipboard(createdKey.api_key)}
                  className="px-4 bg-[#5a2d9c] hover:bg-[#7b3fd3] text-white transition-all pixel-border border-[#5a2d9c] flex items-center justify-center"
                >
                  {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
                </button>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <PixelButton 
                variant="primary" 
                onClick={() => setCreatedKey(null)}
                className="w-full"
                style={{ fontSize: zhScale(10) }}
              >
                {isZh ? '我已保存，关闭' : 'I HAVE SAVED IT, CLOSE'}
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <PixelCard className="max-w-sm w-full p-6 text-center space-y-6" title={isZh ? '确认删除' : 'CONFIRM DELETE'}>
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                <AlertTriangle size={24} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-bold text-white" style={{ fontSize: zhScale(12) }}>
                {isZh ? '确定要删除此密钥吗？' : 'Delete this API key?'}
              </p>
              <p className="text-white/60" style={{ fontSize: zhScale(9) }}>
                {isZh ? '该密钥将立即失效且无法再次使用。' : 'This key will be immediately deactivated and cannot be used again.'}
              </p>
            </div>
            <div className="flex gap-4">
              <PixelButton 
                variant="danger" 
                className="flex-1" 
                onClick={() => handleDeleteKey(showDeleteConfirm)} 
                disabled={isDeleting}
                style={{ fontSize: zhScale(10) }}
              >
                {isDeleting ? (isZh ? '删除中...' : 'DELETING...') : (isZh ? '确认删除' : 'CONFIRM')}
              </PixelButton>
              <PixelButton 
                variant="secondary" 
                className="flex-1" 
                onClick={() => setShowDeleteConfirm(null)}
                disabled={isDeleting}
                style={{ fontSize: zhScale(10) }}
              >
                {isZh ? '取消' : 'CANCEL'}
              </PixelButton>
            </div>
          </PixelCard>
        </div>
      )}
    </div>
  );
};

export default ApiPage;
