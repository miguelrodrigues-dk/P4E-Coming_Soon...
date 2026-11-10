
document.querySelectorAll('.carrossel').forEach(carrossel => {
  const slides = Array.from(
    carrossel.querySelectorAll('.slide')
  );

  const indicadores = carrossel.querySelector('.indicadores');
  const anterior = carrossel.querySelector('.seta-anterior');
  const proxima = carrossel.querySelector('.seta-proxima');

  if (!slides.length) return;

  let atual = 0;

  slides.forEach((_, i) => {
    const ponto = document.createElement('button');

    ponto.type = 'button';
    ponto.className = 'ponto' + (i === 0 ? ' ativo' : '');
    ponto.setAttribute('aria-label', `Mostrar imagem ${i + 1}`);

    ponto.addEventListener('click', () => mostrar(i));

    indicadores.appendChild(ponto);
  });

  const pontos = Array.from(
    indicadores.querySelectorAll('.ponto')
  );

  function mostrar(indice) {
    atual = (indice + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      slide.classList.toggle('ativo', i === atual);
    });

    pontos.forEach((ponto, i) => {
      ponto.classList.toggle('ativo', i === atual);
    });
  }

  anterior.addEventListener('click', () => mostrar(atual - 1));
  proxima.addEventListener('click', () => mostrar(atual + 1));

  if (slides.length > 1) {
    window.setInterval(() => mostrar(atual + 1), 6000);
  }
});
