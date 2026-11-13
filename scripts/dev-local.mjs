// 同时启动本机运行器和开发服务器：网页里的代码用本机 rustc 编译运行（Codespaces / 离线环境适用）
import { spawn } from 'node:child_process';

const children = [
  spawn(process.execPath, ['runner/server.mjs', '--port', '7878'], { stdio: 'inherit' }),
  spawn('npx', ['vite', '--host'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, RUSTLAB_RUNNER: 'http://127.0.0.1:7878', VITE_DEFAULT_RUNNER: 'proxy' },
  }),
];
const stop = () => children.forEach((c) => c.kill());
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const c of children) c.on('exit', (code) => (stop(), process.exit(code ?? 0)));
