export function Legend() {
  return (
    <div className="legend">
      <span className="legend-item">
        <i className="swatch normal" />
        Без конфлікту
      </span>
      <span className="legend-item">
        <i className="swatch teacher" />
        Накладка викладача
      </span>
      <span className="legend-item">
        <i className="swatch room" />
        Накладка аудиторії
      </span>
      <span className="legend-item">
        <i className="swatch pulse" />
        Навантаженість / накладки слоту
      </span>
    </div>
  )
}
