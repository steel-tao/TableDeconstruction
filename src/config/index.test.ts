import { Config } from './index';

describe('Config', () => {
  it('maps environment variables and defaults into the config object', () => {
    expect(Config.env).toBe(process.env.NODE_ENV || 'development');
    expect(Config.isDev).toBe(process.env.NODE_ENV === 'development');
    expect(Config.isProd).toBe(process.env.NODE_ENV === 'production');
    expect(Config.server.port).toBe(parseInt(process.env.PORT || '3000', 10));
    expect(Config.server.host).toBe(process.env.HOST || 'localhost');
    expect(Config.wechat.appId).toBe(process.env.WECHAT_APP_ID || '');
    expect(Config.wechat.appSecret).toBe(process.env.WECHAT_APP_SECRET || '');
    expect(Config.obsidian.vaultPath).toBe(process.env.OBSIDIAN_VAULT_PATH || '');
    expect(Config.obsidian.contentFolder).toBe(process.env.OBSIDIAN_CONTENT_FOLDER || 'content');
    expect(Config.database.type).toBe(process.env.DB_TYPE || 'sqlite');
    expect(Config.database.path).toBe(process.env.DB_PATH || './data/app.db');
    expect(Config.logging.level).toBe(process.env.LOG_LEVEL || 'info');
    expect(Config.logging.format).toBe(process.env.LOG_FORMAT || 'json');
    expect(Config.render.theme).toBe(process.env.RENDER_THEME || 'default');
    expect(Config.render.responsive).toBe(process.env.RENDER_RESPONSIVE !== 'false');
  });
});