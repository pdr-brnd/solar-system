# Sistema Solar 3D
Simulação interativa do Sistema Solar no navegador, em WebGL. Órbitas ao vivo, planetas com textura, luas, cinturões, cometas e missões — com um modo didático e outro mais próximo da escala real.
## Rodar
```bash
npm install
npm run dev
```
Abra `http://localhost:5173/`.
```bash
npm run build    # produção
npm run preview  # servir o build
```
## O que dá para fazer
- Orbitar, zoom e clique para selecionar corpos
- Árvore **Explorar** (mostrar/ocultar, filtrar, focar)
- Velocidade da simulação, pausa e linha do tempo (1957–2035)
- Escala de distâncias (didática → UA) e tamanhos relativos
- Rótulos 3D com nível de detalhe: de longe só os principais
- Tour guiado, mini-mapa da eclíptica e comparador de tamanhos
- VR / tela cheia (`Esc` ou **Sair do VR** para voltar)
- Captura de tela e link da vista atual
**Teclas:** `H` esconde a interface · `Esc` sai do modo imersivo
## Conteúdo
Sol, oito planetas e luas nomeadas, planetas-anões (Ceres, Plutão, Haumea, Makemake, Éris), cinturões de asteroides e de Kuiper, cometa de Halley, Voyager 1/2 e James Webb.
Posições na data usam efemérides Kepler (J2000). Distâncias e raios no modo didático são estilizados para caber na tela.
## Stack
Vite, TypeScript e [Three.js](https://threejs.org/).
Mapas planetários: [Solar System Scope](https://www.solarsystemscope.com/textures/) (CC BY 4.0).
