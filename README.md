# Reactor Radiation Visualizer

[在线体验](https://pxython.github.io/reactor-radiation-visualizer/)

基于 [wzk112/reactor-audio-visualizer](https://github.com/wzk112/reactor-audio-visualizer)（原作者 Andy Wang / wzk112，MIT 许可证）。本版本新增随控制棒起伏增强的屏幕雪花、音频失真和盖格计数器音效，支持独立开关。原作者版权声明及 MIT 许可证完整保留于 [LICENSE](LICENSE)。

以切尔诺贝利反应堆堆芯的控制棒阵列为视觉原型的实时音频可视化实验。

网页使用 Web Audio API 在浏览器本机分析音频，将不同频段的能量映射为 709 根控制棒的升降运动。支持演示信号、本地音频文件、麦克风输入、视角拖动与缩放，以及灵敏度、平滑度和音量调节。

## Run locally

```bash
python3 -m http.server 4173 --directory .
```

Then open <http://localhost:4173>.

## Notes

This is an audiovisual interaction experiment. It is not a physical simulation of a reactor, and audio is processed locally in the browser.

## License

MIT. See [LICENSE](LICENSE).

## 辐射干扰模拟

控制台提供三个默认开启、可独立切换的效果：屏幕雪花、音频失真、盖格计数器。它们随控制棒实际起伏幅度（相对静止位置的均方根位移）增强，灵敏度和平滑度同样会影响效果。

失真使用渐变混音的过载削波；盖格声使用本地合成的随机短脉冲，振幅越大，平均响声越密集。两种音效均遵循播放音量，暂停或切换输入时清理盖格声。麦克风保持静音监听，只单独输出盖格声；频谱分析始终读取原始输入。未播放时不自动发声。

无需构建或额外依赖，部署时请保留 radiation.js。

## 检查

运行 `node radiation.test.cjs` 验证效果强度、独立开关、静音及音效清理（使用 Web Audio 测试替身）。

## 发布

GitHub Pages 从 main 分支的根目录发布。好友可独立播放音频，当前不包含多人同步房间。
