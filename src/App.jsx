import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const CATEGORIAS = [
  "Todo",
  "Tops",
  "Pantalones",
  "Faldas",
  "Vestidos",
  "Zapatos",
  "Accesorios",
];

const COLORES = [
  "Negro",
  "Blanco",
  "Beige",
  "Café",
  "Gris",
  "Rosado",
  "Rojo",
  "Azul",
  "Verde",
  "Amarillo",
];

const ESTILOS = [
  "Casual",
  "Elegante",
  "Vintage",
  "Formal",
  "Romántico",
  "Deportivo",
  "Básico",
];

const CATEGORIAS_LOOK = [
  "Tops",
  "Pantalones",
  "Faldas",
  "Vestidos",
  "Zapatos",
  "Accesorios",
];

function App() {
  const [activeTab, setActiveTab] = useState("inicio");

  const [prendas, setPrendas] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vestelle_prendas")) || [];
    } catch {
      return [];
    }
  });

  const [looks, setLooks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("vestelle_looks")) || [];
    } catch {
      return [];
    }
  });

  const [categoriaActiva, setCategoriaActiva] = useState("Todo");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [foto, setFoto] = useState("");
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("Tops");
  const [color, setColor] = useState("Blanco");
  const [estilo, setEstilo] = useState("Casual");
  const [favorita, setFavorita] = useState(false);

  const [prendaSeleccionada, setPrendaSeleccionada] = useState(null);

  const [seleccionesLook, setSeleccionesLook] = useState({
    Tops: null,
    Pantalones: null,
    Faldas: null,
    Vestidos: null,
    Zapatos: null,
    Accesorios: null,
  });

  const [nombreLook, setNombreLook] = useState("");
  const [modoAleatorio, setModoAleatorio] = useState(false);

  useEffect(() => {
    localStorage.setItem(
      "vestelle_prendas",
      JSON.stringify(prendas)
    );
  }, [prendas]);

  useEffect(() => {
    localStorage.setItem(
      "vestelle_looks",
      JSON.stringify(looks)
    );
  }, [looks]);

  /* =====================================================
     UTILIDADES
  ===================================================== */

  const leerImagen = (archivo) => {
    if (!archivo) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      setFoto(e.target.result);
    };

    reader.readAsDataURL(archivo);
  };

  const limpiarFormulario = () => {
    setFoto("");
    setNombre("");
    setCategoria("Tops");
    setColor("Blanco");
    setEstilo("Casual");
    setFavorita(false);
  };

  const abrirFormulario = () => {
    limpiarFormulario();
    setMostrarFormulario(true);
  };

  const cerrarFormulario = () => {
    limpiarFormulario();
    setMostrarFormulario(false);
  };

  /* =====================================================
     PRENDAS
  ===================================================== */

  const guardarPrenda = () => {
    if (!nombre.trim()) {
      alert("Escribe un nombre para la prenda.");
      return;
    }

    if (!foto) {
      alert("Agrega una foto de la prenda.");
      return;
    }

    const nuevaPrenda = {
      id: Date.now(),
      nombre: nombre.trim(),
      categoria,
      color,
      estilo,
      favorita,
      foto,
      fecha: new Date().toISOString(),
    };

    setPrendas((prev) => [nuevaPrenda, ...prev]);

    cerrarFormulario();
  };

  const eliminarPrenda = (id) => {
    const confirmar = window.confirm(
      "¿Quieres eliminar esta prenda de tu armario?"
    );

    if (!confirmar) return;

    setPrendas((prev) =>
      prev.filter((prenda) => prenda.id !== id)
    );

    setSeleccionesLook((prev) => {
      const nuevas = { ...prev };

      Object.keys(nuevas).forEach((cat) => {
        if (nuevas[cat]?.id === id) {
          nuevas[cat] = null;
        }
      });

      return nuevas;
    });

    setPrendaSeleccionada(null);
  };

  const alternarFavorita = (id) => {
    setPrendas((prev) =>
      prev.map((prenda) =>
        prenda.id === id
          ? {
              ...prenda,
              favorita: !prenda.favorita,
            }
          : prenda
      )
    );
  };

  const prendasFiltradas = useMemo(() => {
    if (categoriaActiva === "Todo") {
      return prendas;
    }

    return prendas.filter(
      (prenda) => prenda.categoria === categoriaActiva
    );
  }, [prendas, categoriaActiva]);

  /* =====================================================
     CONSTRUCTOR DE LOOK
  ===================================================== */

  const seleccionarParaLook = (categoriaLook, prenda) => {
    setSeleccionesLook((prev) => ({
      ...prev,
      [categoriaLook]:
        prev[categoriaLook]?.id === prenda.id
          ? null
          : prenda,
    }));

    setModoAleatorio(false);
  };

  const quitarDelLook = (categoriaLook) => {
    setSeleccionesLook((prev) => ({
      ...prev,
      [categoriaLook]: null,
    }));
  };

  const limpiarLook = () => {
    setSeleccionesLook({
      Tops: null,
      Pantalones: null,
      Faldas: null,
      Vestidos: null,
      Zapatos: null,
      Accesorios: null,
    });

    setNombreLook("");
    setModoAleatorio(false);
  };

  const elegirAleatoriamente = () => {
    if (prendas.length < 2) {
      alert("Necesitas al menos 2 prendas para crear un look.");
      return;
    }

    const porCategoria = (cat) =>
      prendas.filter(
        (prenda) => prenda.categoria === cat
      );

    const tops = porCategoria("Tops");
    const pantalones = porCategoria("Pantalones");
    const faldas = porCategoria("Faldas");
    const vestidos = porCategoria("Vestidos");
    const zapatos = porCategoria("Zapatos");
    const accesorios = porCategoria("Accesorios");

    const aleatorio = (lista) => {
      if (!lista.length) return null;

      return lista[
        Math.floor(Math.random() * lista.length)
      ];
    };

    const nuevoLook = {
      Tops: null,
      Pantalones: null,
      Faldas: null,
      Vestidos: null,
      Zapatos: null,
      Accesorios: null,
    };

    if (vestidos.length > 0 && Math.random() > 0.45) {
      nuevoLook.Vestidos = aleatorio(vestidos);
    } else {
      if (tops.length > 0) {
        nuevoLook.Tops = aleatorio(tops);
      }

      if (pantalones.length > 0 && Math.random() > 0.5) {
        nuevoLook.Pantalones = aleatorio(pantalones);
      } else if (faldas.length > 0) {
        nuevoLook.Faldas = aleatorio(faldas);
      } else if (pantalones.length > 0) {
        nuevoLook.Pantalones = aleatorio(pantalones);
      }
    }

    if (zapatos.length > 0) {
      nuevoLook.Zapatos = aleatorio(zapatos);
    }

    if (
      accesorios.length > 0 &&
      Math.random() > 0.35
    ) {
      nuevoLook.Accesorios = aleatorio(
        accesorios
      );
    }

    setSeleccionesLook(nuevoLook);
    setNombreLook("Look sorpresa");
    setModoAleatorio(true);
  };

  const prendasSeleccionadas = Object.values(
    seleccionesLook
  ).filter(Boolean);

  const tieneVestido =
    Boolean(seleccionesLook.Vestidos);

  const guardarLook = () => {
    if (prendasSeleccionadas.length < 2) {
      alert(
        "Selecciona al menos 2 prendas para guardar el look."
      );
      return;
    }

    const nuevoLook = {
      id: Date.now(),
      nombre:
        nombreLook.trim() || "Mi look",
      prendas: prendasSeleccionadas,
      fecha: new Date().toISOString(),
    };

    setLooks((prev) => [
      nuevoLook,
      ...prev,
    ]);

    alert(
      "¡Look guardado en tu colección! ✨"
    );

    setNombreLook("");
    setModoAleatorio(false);
  };

  const eliminarLook = (id) => {
    const confirmar = window.confirm(
      "¿Quieres eliminar este look guardado?"
    );

    if (!confirmar) return;

    setLooks((prev) =>
      prev.filter((look) => look.id !== id)
    );
  };

  /* =====================================================
     TABLERO NUEVO DE LOOK
  ===================================================== */

  const renderLookBoard = () => {
    const top = seleccionesLook.Tops;
    const bottom =
      seleccionesLook.Pantalones ||
      seleccionesLook.Faldas;
    const dress = seleccionesLook.Vestidos;
    const shoes = seleccionesLook.Zapatos;
    const accessory =
      seleccionesLook.Accesorios;

    const hayLook =
      top ||
      bottom ||
      dress ||
      shoes ||
      accessory;

    if (!hayLook) {
      return (
        <div className="look-board">
          <div className="empty-board">
            <div className="empty-board-icon">
              ✦
            </div>

            <h3>
              Tu look aparecerá aquí
            </h3>

            <p>
              Selecciona prendas de tu
              colección para construir
              una combinación.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="look-board">
        <div className="board-top-label">
          {modoAleatorio
            ? "LOOK ELEGIDO POR VESTELLE"
            : "TU LOOK"}
        </div>

        <div className="board-outfit">

          {/* VESTIDO */}
          {dress && (
            <div className="board-item board-dress">
              <button
                className="board-remove"
                type="button"
                onClick={() =>
                  quitarDelLook("Vestidos")
                }
              >
                ×
              </button>

              <img
                src={dress.foto}
                alt={dress.nombre}
              />

              <span>{dress.nombre}</span>
            </div>
          )}

          {/* TOP + PARTE INFERIOR */}
          {!dress && (
            <div className="board-top-bottom">

              {top && (
                <div className="board-item board-top">
                  <button
                    className="board-remove"
                    type="button"
                    onClick={() =>
                      quitarDelLook("Tops")
                    }
                  >
                    ×
                  </button>

                  <img
                    src={top.foto}
                    alt={top.nombre}
                  />

                  <span>{top.nombre}</span>
                </div>
              )}

              {bottom && (
                <div className="board-item board-bottom">
                  <button
                    className="board-remove"
                    type="button"
                    onClick={() =>
                      quitarDelLook(
                        seleccionesLook.Pantalones
                          ? "Pantalones"
                          : "Faldas"
                      )
                    }
                  >
                    ×
                  </button>

                  <img
                    src={bottom.foto}
                    alt={bottom.nombre}
                  />

                  <span>
                    {bottom.nombre}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ACCESORIOS */}
          {(shoes || accessory) && (
            <div className="board-accessories">

              {shoes && (
                <div className="board-item board-small">
                  <button
                    className="board-remove"
                    type="button"
                    onClick={() =>
                      quitarDelLook("Zapatos")
                    }
                  >
                    ×
                  </button>

                  <img
                    src={shoes.foto}
                    alt={shoes.nombre}
                  />

                  <span>
                    {shoes.nombre}
                  </span>
                </div>
              )}

              {accessory && (
                <div className="board-item board-small">
                  <button
                    className="board-remove"
                    type="button"
                    onClick={() =>
                      quitarDelLook("Accesorios")
                    }
                  >
                    ×
                  </button>

                  <img
                    src={accessory.foto}
                    alt={accessory.nombre}
                  />

                  <span>
                    {accessory.nombre}
                  </span>
                </div>
              )}

            </div>
          )}
        </div>

        <div className="board-caption">
          {nombreLook ||
            (modoAleatorio
              ? "Look sorpresa"
              : "Tu combinación")}
        </div>
      </div>
    );
  };

  /* =====================================================
     INICIO
  ===================================================== */

  const renderInicio = () => {
    const favoritas = prendas.filter(
      (prenda) => prenda.favorita
    );

    return (
      <section className="page-section home-page">

        <div className="hero">
          <div className="hero-eyebrow">
            VESTELLE
          </div>

          <h1>
            Tu armario,
            <br />
            tu estilo.
          </h1>

          <p>
            Todo lo que tienes. Todo lo que eres.
            <br />
            En un solo lugar.
          </p>

          <button
            className="primary-button"
            onClick={abrirFormulario}
          >
            + Añadir prenda
          </button>
        </div>

        <div className="home-stats">

          <div>
            <strong>
              {prendas.length}
            </strong>

            <span>
              Prendas
            </span>
          </div>

          <div>
            <strong>
              {looks.length}
            </strong>

            <span>
              Looks
            </span>
          </div>

          <div>
            <strong>
              {favoritas.length}
            </strong>

            <span>
              Favoritas
            </span>
          </div>

        </div>

        <div className="home-block">

          <div className="section-heading">

            <div>
              <small>
                TU COLECCIÓN
              </small>

              <h2>
                Mi armario
              </h2>
            </div>

            <button
              className="text-button"
              onClick={() =>
                setActiveTab("armario")
              }
            >
              Ver todo →
            </button>

          </div>

          {prendas.length === 0 ? (
            <div className="empty-state">

              <div className="empty-icon">
                ♡
              </div>

              <h3>
                Tu armario está esperando
              </h3>

              <p>
                Empieza agregando las prendas
                que tienes en tu colección.
              </p>

              <button
                className="secondary-button"
                onClick={abrirFormulario}
              >
                Añadir mi primera prenda
              </button>

            </div>
          ) : (
            <div className="mini-grid">

              {prendas
                .slice(0, 4)
                .map((prenda) => (
                  <button
                    className="mini-card"
                    key={prenda.id}
                    onClick={() =>
                      setPrendaSeleccionada(
                        prenda
                      )
                    }
                  >
                    <img
                      src={prenda.foto}
                      alt={prenda.nombre}
                    />

                    <span>
                      {prenda.nombre}
                    </span>
                  </button>
                ))}

            </div>
          )}

        </div>

        <div className="home-buttons">

          <button
            className="feature-card"
            onClick={() =>
              setActiveTab("looks")
            }
          >
            <span className="feature-icon">
              ✦
            </span>

            <strong>
              Crear un look
            </strong>

            <small>
              Combina tus prendas
            </small>
          </button>

          <button
            className="feature-card"
            onClick={() => {
              setActiveTab("looks");

              setTimeout(() => {
                elegirAleatoriamente();
              }, 50);
            }}
          >
            <span className="feature-icon">
              ✧
            </span>

            <strong>
              Elige por mí
            </strong>

            <small>
              Déjate sorprender
            </small>
          </button>

        </div>

      </section>
    );
  };

  /* =====================================================
     ARMARIO
  ===================================================== */

  const renderArmario = () => {
    return (
      <section className="page-section">

        <div className="page-header">

          <div>
            <small>
              TU COLECCIÓN
            </small>

            <h1>
              Mi armario
            </h1>

            <p>
              {prendas.length === 0
                ? "Todavía no tienes prendas."
                : `${prendas.length} ${
                    prendas.length === 1
                      ? "prenda"
                      : "prendas"
                  } en tu colección.`}
            </p>
          </div>

          <button
            className="primary-button"
            onClick={abrirFormulario}
          >
            + Añadir prenda
          </button>

        </div>

        <div className="category-tabs">

          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              className={
                categoriaActiva === cat
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategoriaActiva(cat)
              }
            >
              {cat}
            </button>
          ))}

        </div>

        {prendasFiltradas.length === 0 ? (
          <div className="empty-state">

            <div className="empty-icon">
              ♡
            </div>

            <h3>
              No hay prendas aquí
            </h3>

            <p>
              Agrega una prenda o cambia
              la categoría.
            </p>

            <button
              className="secondary-button"
              onClick={abrirFormulario}
            >
              Añadir prenda
            </button>

          </div>
        ) : (
          <div className="closet-grid">

            {prendasFiltradas.map(
              (prenda) => (
                <article
                  className="closet-card"
                  key={prenda.id}
                >

                  <button
                    className="closet-photo"
                    onClick={() =>
                      setPrendaSeleccionada(
                        prenda
                      )
                    }
                  >

                    <img
                      src={prenda.foto}
                      alt={prenda.nombre}
                    />

                    {prenda.favorita && (
                      <span className="favorite-badge">
                        ♥
                      </span>
                    )}

                  </button>

                  <div className="closet-info">

                    <div>

                      <h3>
                        {prenda.nombre}
                      </h3>

                      <p>
                        {prenda.color} ·{" "}
                        {prenda.estilo}
                      </p>

                    </div>

                    <button
                      className="heart-button"
                      onClick={() =>
                        alternarFavorita(
                          prenda.id
                        )
                      }
                      type="button"
                    >
                      {prenda.favorita
                        ? "♥"
                        : "♡"}
                    </button>

                  </div>

                </article>
              )
            )}

          </div>
        )}

      </section>
    );
  };

  /* =====================================================
     LOOKS
  ===================================================== */

  const renderLooks = () => {

    if (prendas.length < 2) {
      return (
        <section className="page-section">

          <div className="page-header">

            <div>
              <small>
                VESTELLE
              </small>

              <h1>
                Mis looks
              </h1>

              <p>
                Combina las prendas de tu
                armario.
              </p>
            </div>

          </div>

          <div className="empty-state">

            <div className="empty-icon">
              ✦
            </div>

            <h3>
              Necesitas más prendas
            </h3>

            <p>
              Agrega al menos dos prendas
              para empezar a crear looks.
            </p>

            <button
              className="primary-button"
              onClick={abrirFormulario}
            >
              + Añadir prenda
            </button>

          </div>

        </section>
      );
    }

    return (
      <section className="page-section looks-page">

        <div className="page-header">

          <div>
            <small>
              VESTELLE
            </small>

            <h1>
              Crear un look
            </h1>

            <p>
              Combina tus prendas para
              crear una nueva historia.
            </p>
          </div>

        </div>

        <div className="look-actions">

          <button
            className="secondary-button"
            onClick={elegirAleatoriamente}
          >
            ✦ Elige por mí
          </button>

          <button
            className="text-button"
            onClick={limpiarLook}
          >
            Limpiar
          </button>

        </div>

        {renderLookBoard()}

        <div className="look-save-area">

          <label>
            Nombre de tu look
          </label>

          <input
            type="text"
            value={nombreLook}
            onChange={(e) =>
              setNombreLook(
                e.target.value
              )
            }
            placeholder="Ej. Domingo vintage"
          />

          <button
            className="primary-button full-width"
            onClick={guardarLook}
          >
            Guardar look
          </button>

        </div>

        <div className="selection-section">

          <div className="section-heading">

            <div>
              <small>
                ELIGE TUS PRENDAS
              </small>

              <h2>
                Mi colección
              </h2>
            </div>

          </div>

          {CATEGORIAS_LOOK.map(
            (cat) => {

              const prendasCategoria =
                prendas.filter(
                  (prenda) =>
                    prenda.categoria === cat
                );

              if (
                !prendasCategoria.length
              ) {
                return null;
              }

              return (
                <div
                  className="look-category"
                  key={cat}
                >

                  <div className="look-category-title">

                    <h3>
                      {cat}
                    </h3>

                    {seleccionesLook[
                      cat
                    ] && (
                      <span>
                        Seleccionado
                      </span>
                    )}

                  </div>

                  <div className="selection-grid">

                    {prendasCategoria.map(
                      (prenda) => {

                        const seleccionada =
                          seleccionesLook[
                            cat
                          ]?.id ===
                          prenda.id;

                        return (
                          <button
                            key={prenda.id}
                            className={`selection-card ${
                              seleccionada
                                ? "selected"
                                : ""
                            }`}
                            onClick={() =>
                              seleccionarParaLook(
                                cat,
                                prenda
                              )
                            }
                          >

                            <img
                              src={
                                prenda.foto
                              }
                              alt={
                                prenda.nombre
                              }
                            />

                            {seleccionada && (
                              <span className="selection-check">
                                ✓
                              </span>
                            )}

                            <small>
                              {prenda.nombre}
                            </small>

                          </button>
                        );
                      }
                    )}

                  </div>

                </div>
              );
            }
          )}

        </div>

        {looks.length > 0 && (
          <div className="saved-looks">

            <div className="section-heading">

              <div>
                <small>
                  TUS CREACIONES
                </small>

                <h2>
                  Looks guardados
                </h2>
              </div>

            </div>

            {looks.map((look) => (
              <article
                className="saved-look"
                key={look.id}
              >

                <div className="saved-look-header">

                  <div>
                    <small>
                      LOOK
                    </small>

                    <h3>
                      {look.nombre}
                    </h3>
                  </div>

                  <button
                    className="delete-button"
                    onClick={() =>
                      eliminarLook(
                        look.id
                      )
                    }
                  >
                    Eliminar
                  </button>

                </div>

                <div className="saved-look-grid">

                  {look.prendas.map(
                    (prenda) => (
                      <div
                        className="saved-look-item"
                        key={prenda.id}
                      >

                        <img
                          src={
                            prenda.foto
                          }
                          alt={
                            prenda.nombre
                          }
                        />

                        <span>
                          {prenda.nombre}
                        </span>

                      </div>
                    )
                  )}

                </div>

              </article>
            ))}

          </div>
        )}

      </section>
    );
  };

  /* =====================================================
     CALENDARIO
  ===================================================== */

  const renderCalendario = () => {
    return (
      <section className="page-section">

        <div className="page-header">

          <div>
            <small>
              ORGANIZA TU ESTILO
            </small>

            <h1>
              Calendario
            </h1>

            <p>
              Próximamente podrás planear
              tus looks.
            </p>
          </div>

        </div>

        <div className="coming-soon">

          <div className="coming-soon-icon">
            ♧
          </div>

          <h2>
            Tu estilo, día a día
          </h2>

          <p>
            Aquí podrás organizar qué look
            usar cada día, guardar tu
            historial y descubrir cuáles
            son tus prendas favoritas.
          </p>

        </div>

      </section>
    );
  };

  /* =====================================================
     MÁS
  ===================================================== */

  const renderMas = () => {
    return (
      <section className="page-section">

        <div className="page-header">

          <div>
            <small>
              VESTELLE
            </small>

            <h1>
              Más
            </h1>

            <p>
              Personaliza tu experiencia.
            </p>
          </div>

        </div>

        <div className="more-menu">

          <div className="more-card">

            <span>
              ♡
            </span>

            <div>
              <strong>
                Favoritos
              </strong>

              <p>
                {
                  prendas.filter(
                    (p) =>
                      p.favorita
                  ).length
                }{" "}
                prendas favoritas
              </p>
            </div>

          </div>

          <div className="more-card">

            <span>
              ✦
            </span>

            <div>
              <strong>
                Mis looks
              </strong>

              <p>
                {looks.length} looks
                guardados
              </p>
            </div>

          </div>

          <div className="more-card">

            <span>
              ⌁
            </span>

            <div>
              <strong>
                Vestelle
              </strong>

              <p>
                Tu armario, tu estilo.
              </p>
            </div>

          </div>

        </div>

      </section>
    );
  };

  /* =====================================================
     FORMULARIO
  ===================================================== */

  const renderFormulario = () => {

    if (!mostrarFormulario) {
      return null;
    }

    return (
      <div className="modal-overlay">

        <div className="modal">

          <div className="modal-header">

            <div>
              <small>
                NUEVA PRENDA
              </small>

              <h2>
                Añadir a mi colección
              </h2>
            </div>

            <button
              className="modal-close"
              onClick={cerrarFormulario}
              type="button"
            >
              ×
            </button>

          </div>

          <label className="upload-area">

            {foto ? (
              <img
                src={foto}
                alt="Vista previa"
              />
            ) : (
              <>
                <span className="upload-icon">
                  ＋
                </span>

                <strong>
                  Sube una foto
                </strong>

                <small>
                  Elige una foto desde tu
                  dispositivo
                </small>
              </>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                leerImagen(
                  e.target.files?.[0]
                )
              }
            />

          </label>

          <div className="form-grid">

            <label>
              Nombre

              <input
                value={nombre}
                onChange={(e) =>
                  setNombre(
                    e.target.value
                  )
                }
                placeholder="Ej. Blusa blanca"
              />
            </label>

            <label>
              Categoría

              <select
                value={categoria}
                onChange={(e) =>
                  setCategoria(
                    e.target.value
                  )
                }
              >
                {CATEGORIAS_LOOK.map(
                  (cat) => (
                    <option
                      key={cat}
                      value={cat}
                    >
                      {cat}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Color

              <select
                value={color}
                onChange={(e) =>
                  setColor(
                    e.target.value
                  )
                }
              >
                {COLORES.map((c) => (
                  <option
                    key={c}
                    value={c}
                  >
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Estilo

              <select
                value={estilo}
                onChange={(e) =>
                  setEstilo(
                    e.target.value
                  )
                }
              >
                {ESTILOS.map((e) => (
                  <option
                    key={e}
                    value={e}
                  >
                    {e}
                  </option>
                ))}
              </select>
            </label>

          </div>

          <label className="favorite-toggle">

            <input
              type="checkbox"
              checked={favorita}
              onChange={(e) =>
                setFavorita(
                  e.target.checked
                )
              }
            />

            <span>
              ♡
            </span>

            <div>

              <strong>
                Agregar a favoritos
              </strong>

              <small>
                Podrás encontrarla fácilmente
                después.
              </small>

            </div>

          </label>

          <div className="modal-actions">

            <button
              className="secondary-button"
              onClick={cerrarFormulario}
              type="button"
            >
              Cancelar
            </button>

            <button
              className="primary-button"
              onClick={guardarPrenda}
              type="button"
            >
              Guardar prenda
            </button>

          </div>

        </div>

      </div>
    );
  };

  /* =====================================================
     DETALLE PRENDA
  ===================================================== */

  const renderDetallePrenda = () => {

    if (!prendaSeleccionada) {
      return null;
    }

    const prenda =
      prendaSeleccionada;

    return (
      <div className="modal-overlay">

        <div className="modal detail-modal">

          <button
            className="modal-close"
            onClick={() =>
              setPrendaSeleccionada(
                null
              )
            }
            type="button"
          >
            ×
          </button>

          <div className="detail-image">

            <img
              src={prenda.foto}
              alt={prenda.nombre}
            />

          </div>

          <div className="detail-content">

            <small>
              {prenda.categoria}
            </small>

            <h2>
              {prenda.nombre}
            </h2>

            <p>
              {prenda.color} ·{" "}
              {prenda.estilo}
            </p>

            <button
              className="secondary-button full-width"
              onClick={() =>
                alternarFavorita(
                  prenda.id
                )
              }
            >
              {prenda.favorita
                ? "♥ Quitar de favoritos"
                : "♡ Agregar a favoritos"}
            </button>

            <button
              className="danger-button full-width"
              onClick={() =>
                eliminarPrenda(
                  prenda.id
                )
              }
            >
              Eliminar prenda
            </button>

          </div>

        </div>

      </div>
    );
  };

  /* =====================================================
     NAVEGACIÓN
  ===================================================== */

  const cambiarTab = (tab) => {
    setActiveTab(tab);
  };

  const renderContenido = () => {

    switch (activeTab) {

      case "inicio":
        return renderInicio();

      case "armario":
        return renderArmario();

      case "looks":
        return renderLooks();

      case "calendario":
        return renderCalendario();

      case "mas":
        return renderMas();

      default:
        return renderInicio();
    }
  };

  /* =====================================================
     APP
  ===================================================== */

  return (
    <div className="app">

      <header className="top-header">

        <button
          className="brand"
          onClick={() =>
            cambiarTab("inicio")
          }
          type="button"
        >

          <span className="brand-mark">
            V
          </span>

          <span className="brand-name">
            VESTELLE
          </span>

        </button>

        <button
          className="header-add"
          onClick={abrirFormulario}
          type="button"
        >
          + Añadir
        </button>

      </header>

      <main>
        {renderContenido()}
      </main>

      <nav className="bottom-nav">

        <button
          className={
            activeTab === "inicio"
              ? "active"
              : ""
          }
          onClick={() =>
            cambiarTab("inicio")
          }
          type="button"
        >
          <span>⌂</span>
          <small>
            Inicio
          </small>
        </button>

        <button
          className={
            activeTab === "armario"
              ? "active"
              : ""
          }
          onClick={() =>
            cambiarTab("armario")
          }
          type="button"
        >
          <span>♧</span>
          <small>
            Armario
          </small>
        </button>

        <button
          className={
            activeTab === "looks"
              ? "active"
              : ""
          }
          onClick={() =>
            cambiarTab("looks")
          }
          type="button"
        >
          <span>✦</span>
          <small>
            Looks
          </small>
        </button>

        <button
          className={
            activeTab === "calendario"
              ? "active"
              : ""
          }
          onClick={() =>
            cambiarTab("calendario")
          }
          type="button"
        >
          <span>□</span>
          <small>
            Calendario
          </small>
        </button>

        <button
          className={
            activeTab === "mas"
              ? "active"
              : ""
          }
          onClick={() =>
            cambiarTab("mas")
          }
          type="button"
        >
          <span>•••</span>
          <small>
            Más
          </small>
        </button>

      </nav>

      {renderFormulario()}
      {renderDetallePrenda()}

    </div>
  );
}

export default App;