/**
 * IndexedDB 本地存储适配器
 * 在浏览器全局作用域中运行，将所有 IndexedDB 操作转发到后端 API
 * 
 * 使用方式：在主页加载前注入此脚本
 * <script src="/local-storage-adapter.js"></script>
 */

(function() {
  console.log('🔌 本地存储适配器已加载');

  // 后端 API 的基础 URL
  const API_BASE = '/api/storage';
  let documentCache = {};

  /**
   * LocalIDB - 客户端模拟 IndexedDB，使用本地 API 作为后端
   */
  class LocalIDB {
    constructor() {
      this.stores = {
        documents: [],
        cache: [],
        meta: [],
        settings: [],
        secrets: []
      };
      this.initialized = false;
    }

    /**
     * 初始化：从后端加载所有文档
     */
    async init() {
      if (this.initialized) return;
      try {
        const response = await fetch(`${API_BASE}/documents`);
        const result = await response.json();
        if (result.success) {
          this.stores.documents = result.data || [];
          documentCache = Object.fromEntries(
            this.stores.documents.map(doc => [doc.id, doc])
          );
          console.log('✅ 从本地存储加载了', result.data.length, '个文档');
        }
        this.initialized = true;
      } catch (error) {
        console.error('❌ 初始化本地存储失败:', error);
      }
    }

    /**
     * 打开数据库（模拟）
     */
    open(dbName) {
      const self = this;
      return {
        then: function(callback) {
          self.init().then(() => {
            callback({
              objectStoreNames: Object.keys(self.stores),
              transaction: function(stores, mode) {
                return {
                  objectStore: function(storeName) {
                    return new ObjectStore(storeName, self.stores[storeName] || []);
                  }
                };
              }
            });
          });
        }
      };
    }
  }

  /**
   * ObjectStore - 模拟 IndexedDB ObjectStore
   */
  class ObjectStore {
    constructor(name, data) {
      this.name = name;
      this.data = data;
    }

    add(item) {
      if (this.name === 'documents') {
        return this._saveToDB(item);
      }
      this.data.push(item);
      return { result: item };
    }

    put(item) {
      return this.add(item);
    }

    get(key) {
      const item = this.data.find(x => x.id === key || x.key === key);
      return { result: item };
    }

    getAll() {
      return { result: this.data };
    }

    delete(key) {
      const index = this.data.findIndex(x => x.id === key || x.key === key);
      if (index !== -1) {
        const item = this.data[index];
        if (this.name === 'documents') {
          return this._deleteFromDB(item.id);
        }
        this.data.splice(index, 1);
      }
      return { result: null };
    }

    clear() {
      this.data = [];
      return { result: null };
    }

    /**
     * 保存到后端
     */
    async _saveToDB(item) {
      try {
        const response = await fetch(`${API_BASE}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        const result = await response.json();
        if (result.success) {
          documentCache[item.id] = result.data;
          // 也保存到本地 data 数组
          const index = this.data.findIndex(x => x.id === item.id);
          if (index !== -1) {
            this.data[index] = result.data;
          } else {
            this.data.push(result.data);
          }
          console.log('💾 文档已保存到本地:', item.id);
          return { result: result.data };
        }
      } catch (error) {
        console.error('❌ 保存文档失败:', error);
      }
      return { result: item };
    }

    /**
     * 从后端删除
     */
    async _deleteFromDB(id) {
      try {
        const response = await fetch(`${API_BASE}/documents/${id}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
          delete documentCache[id];
          const index = this.data.findIndex(x => x.id === id);
          if (index !== -1) {
            this.data.splice(index, 1);
          }
          console.log('🗑️ 文档已从本地删除:', id);
          return { result: null };
        }
      } catch (error) {
        console.error('❌ 删除文档失败:', error);
      }
      return { result: null };
    }
  }

  /**
   * 全局 localStorageDB 接口（模拟前端期望的 API）
   */
  window.localStorageDB = new LocalIDB();

  /**
   * Hook 原生 IndexedDB（如果前端直接使用 IndexedDB）
   */
  const OriginalIndexedDB = window.indexedDB;
  
  window.indexedDB = {
    open: function(name) {
      if (name === 'doocs-md') {
        // 使用本地实现
        console.log('🔄 拦截 IndexedDB.open("doocs-md")，转发到本地存储');
        return {
          onsuccess: null,
          onerror: null,
          addEventListener: function(event, handler) {
            if (event === 'success') {
              this.onsuccess = handler;
              // 异步执行
              setTimeout(() => {
                if (this.onsuccess) {
                  this.onsuccess({ target: { result: this } });
                }
              }, 0);
            }
          },
          transaction: function(stores, mode) {
            return {
              objectStore: function(storeName) {
                return new ObjectStore(storeName, window.localStorageDB.stores[storeName] || []);
              }
            };
          },
          objectStoreNames: Object.keys(window.localStorageDB.stores)
        };
      }
      // 其他数据库保持原样
      return OriginalIndexedDB.open(name);
    },
    databases: function() {
      return Promise.resolve([
        { name: 'doocs-md' }
      ]);
    },
    deleteDatabase: function(name) {
      console.log('删除数据库:', name);
      return { result: null };
    }
  };

  /**
   * 提供全局的存储管理接口
   */
  window.__LocalStorage__ = {
    // 获取所有文档
    getAll: async function() {
      try {
        const response = await fetch(`${API_BASE}/documents`);
        const result = await response.json();
        return result.success ? result.data : [];
      } catch (error) {
        console.error('获取文档列表失败:', error);
        return [];
      }
    },

    // 保存文档
    save: async function(id, data) {
      try {
        const response = await fetch(`${API_BASE}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...data })
        });
        const result = await response.json();
        return result.success ? result.data : null;
      } catch (error) {
        console.error('保存文档失败:', error);
        return null;
      }
    },

    // 删除文档
    delete: async function(id) {
      try {
        const response = await fetch(`${API_BASE}/documents/${id}`, {
          method: 'DELETE'
        });
        const result = await response.json();
        return result.success;
      } catch (error) {
        console.error('删除文档失败:', error);
        return false;
      }
    },

    // 导出所有文档
    export: async function() {
      try {
        const response = await fetch(`${API_BASE}/export`, {
          method: 'POST'
        });
        const result = await response.json();
        return result.success ? result.data : [];
      } catch (error) {
        console.error('导出失败:', error);
        return [];
      }
    },

    // 导入文档
    import: async function(documents) {
      try {
        const response = await fetch(`${API_BASE}/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documents })
        });
        const result = await response.json();
        return result.success ? result.data : [];
      } catch (error) {
        console.error('导入失败:', error);
        return [];
      }
    }
  };

  /**
   * 拦截浏览器原生 localStorage
   * 将所有 setItem 操作转发到后端 API
   */
  const OriginalStorage = window.localStorage;
  const localStorageProxy = {
    data: {},
    
    setItem: function(key, value) {
      try {
        // 检查是否是文档数据
        if (key.startsWith('doc-') || key === 'documents' || key.includes('content')) {
          console.log('📝 localStorage.setItem 拦截:', key);
          
          // 尝试解析 JSON
          let parsedData = null;
          try {
            parsedData = JSON.parse(value);
          } catch (e) {
            parsedData = { content: value };
          }
          
          // 如果是文档数据，转发到后端
          if (typeof parsedData === 'object' && parsedData !== null) {
            const docId = key.replace('doc-', '') || 'default';
            fetch(`${API_BASE}/documents`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: docId,
                title: parsedData.title || docId,
                content: parsedData.content || value
              })
            }).then(res => res.json())
              .then(result => {
                if (result.success) {
                  console.log('✅ localStorage 数据已同步到后端:', docId);
                }
              })
              .catch(err => console.error('❌ localStorage 同步失败:', err));
          }
        }
        
        // 也保存到本地
        this.data[key] = value;
        OriginalStorage.setItem(key, value);
      } catch (error) {
        console.error('localStorage.setItem 错误:', error);
      }
    },
    
    getItem: function(key) {
      // 优先返回本地数据
      if (this.data.hasOwnProperty(key)) {
        return this.data[key];
      }
      return OriginalStorage.getItem(key);
    },
    
    removeItem: function(key) {
      delete this.data[key];
      // 如果是文档数据，从后端也删除
      if (key.startsWith('doc-')) {
        const docId = key.replace('doc-', '');
        fetch(`${API_BASE}/documents/${docId}`, {
          method: 'DELETE'
        }).then(res => res.json())
          .then(result => {
            if (result.success) {
              console.log('✅ localStorage 文档已从后端删除:', docId);
            }
          })
          .catch(err => console.error('❌ localStorage 删除失败:', err));
      }
      OriginalStorage.removeItem(key);
    },
    
    clear: function() {
      this.data = {};
      OriginalStorage.clear();
    },
    
    key: function(index) {
      return OriginalStorage.key(index);
    },
    
    get length() {
      return OriginalStorage.length;
    }
  };
  
  // 用 Proxy 完全代理 localStorage
  try {
    window.localStorage = new Proxy(OriginalStorage, {
      get: function(target, prop) {
        if (prop === 'setItem') return localStorageProxy.setItem.bind(localStorageProxy);
        if (prop === 'getItem') return localStorageProxy.getItem.bind(localStorageProxy);
        if (prop === 'removeItem') return localStorageProxy.removeItem.bind(localStorageProxy);
        if (prop === 'clear') return localStorageProxy.clear.bind(localStorageProxy);
        if (prop === 'key') return localStorageProxy.key.bind(localStorageProxy);
        if (prop === 'length') return target.length;
        return target[prop];
      },
      set: function(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });
    console.log('✅ localStorage 拦截已启用');
  } catch (e) {
    console.log('⚠️ localStorage Proxy 不支持，使用备用方案');
  }

  // 初始化
  window.localStorageDB.init().then(() => {
    console.log('✅ 本地存储初始化完成');
    // 触发自定义事件，让应用知道存储已准备好
    window.dispatchEvent(new CustomEvent('localStorageReady'));
  });

  console.log('📦 本地存储适配器已就绪，API 接口: window.__LocalStorage__');
})();
