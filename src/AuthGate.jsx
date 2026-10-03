import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import App from "./App";

function AuthGate() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [procesando, setProcesando] = useState(false);

  const [mostrarCuenta, setMostrarCuenta] =
    useState(false);

  useEffect(() => {
    let activo = true;

    const cargarSesion = async () => {
      const { data, error } =
        await supabase.auth.getSession();

      if (!activo) return;

      if (error) {
        console.error(
          "Error al obtener la sesión:",
          error
        );
      }

      setSession(data?.session ?? null);
      setLoading(false);
    };

    cargarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, nuevaSesion) => {
        if (!activo) return;

        setSession(nuevaSesion ?? null);
        setLoading(false);
      }
    );

    return () => {
      activo = false;
      subscription.unsubscribe();
    };
  }, []);

  const manejarFormulario = async (e) => {
    e.preventDefault();

    setMensaje("");

    const correo = email.trim();

    if (!correo || !password) {
      setMensaje(
        "Escribe tu correo y contraseña."
      );
      return;
    }

    if (password.length < 6) {
      setMensaje(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    setProcesando(true);

    try {
      if (modo === "registro") {
        const { data, error } =
          await supabase.auth.signUp({
            email: correo,
            password,
          });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setMensaje(
            "Tu cuenta fue creada. Revisa tu correo para confirmar tu cuenta y luego inicia sesión."
          );
        } else {
          setMensaje(
            "¡Cuenta creada! Bienvenida a Vestelle."
          );
        }
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email: correo,
            password,
          });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error(
        "Error de autenticación:",
        error
      );

      const mensajeError =
        error?.message?.toLowerCase() || "";

      if (
        mensajeError.includes(
          "invalid login credentials"
        )
      ) {
        setMensaje(
          "El correo o la contraseña no son correctos."
        );
      } else if (
        mensajeError.includes(
          "email not confirmed"
        )
      ) {
        setMensaje(
          "Primero debes confirmar tu correo electrónico."
        );
      } else if (
        mensajeError.includes(
          "user already registered"
        )
      ) {
        setMensaje(
          "Este correo ya tiene una cuenta. Intenta iniciar sesión."
        );
      } else {
        setMensaje(
          error?.message ||
            "No pudimos completar la operación."
        );
      }
    } finally {
      setProcesando(false);
    }
  };

  const cerrarSesion = async () => {
    setMostrarCuenta(false);

    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Error al cerrar sesión:",
        error
      );
      return;
    }

    setSession(null);
  };

  if (loading) {
    return (
      <div style={estilos.pantalla}>
        <div style={estilos.cargando}>
          VESTELLE
        </div>
      </div>
    );
  }

  if (session) {
    const correoUsuario =
      session.user?.email || "";

    const inicial =
      correoUsuario
        .charAt(0)
        .toUpperCase() || "P";

    return (
      <div style={estilos.contenedorApp}>
        <App />

        <div style={estilos.cuentaWrapper}>
          <button
            type="button"
            onClick={() =>
              setMostrarCuenta(
                (actual) => !actual
              )
            }
            style={estilos.botonCuenta}
            aria-label="Mi cuenta"
          >
            {inicial}
          </button>

          {mostrarCuenta && (
            <div style={estilos.menuCuenta}>
              <div style={estilos.menuEncabezado}>
                <div style={estilos.avatarGrande}>
                  {inicial}
                </div>

                <div
                  style={
                    estilos.infoUsuario
                  }
                >
                  <strong
                    style={
                      estilos.tituloCuenta
                    }
                  >
                    Mi cuenta
                  </strong>

                  <span
                    style={
                      estilos.correoCuenta
                    }
                  >
                    {correoUsuario}
                  </span>
                </div>
              </div>

              <div
                style={
                  estilos.estadoVerificado
                }
              >
                <span>✓</span>
                <span>
                  Correo verificado
                </span>
              </div>

              <button
                type="button"
                onClick={cerrarSesion}
                style={estilos.botonCerrar}
              >
                <span>↪</span>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={estilos.pantalla}>
      <div style={estilos.tarjeta}>
        <div style={estilos.logo}>
          V
        </div>

        <div style={estilos.nombreMarca}>
          VESTELLE
        </div>

        <p style={estilos.subtitulo}>
          Tu armario, tu estilo.
        </p>

        <div style={estilos.pestanas}>
          <button
            type="button"
            onClick={() => {
              setModo("login");
              setMensaje("");
            }}
            style={{
              ...estilos.pestana,
              ...(modo === "login"
                ? estilos.pestanaActiva
                : {}),
            }}
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            onClick={() => {
              setModo("registro");
              setMensaje("");
            }}
            style={{
              ...estilos.pestana,
              ...(modo === "registro"
                ? estilos.pestanaActiva
                : {}),
            }}
          >
            Crear cuenta
          </button>
        </div>

        <form
          onSubmit={manejarFormulario}
        >
          <label style={estilos.label}>
            Correo electrónico
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="tu@correo.com"
            autoComplete="email"
            style={estilos.input}
          />

          <label style={estilos.label}>
            Contraseña
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Mínimo 6 caracteres"
            autoComplete={
              modo === "registro"
                ? "new-password"
                : "current-password"
            }
            style={estilos.input}
          />

          {mensaje && (
            <div style={estilos.mensaje}>
              {mensaje}
            </div>
          )}

          <button
            type="submit"
            disabled={procesando}
            style={{
              ...estilos.botonPrincipal,
              opacity: procesando
                ? 0.7
                : 1,
            }}
          >
            {procesando
              ? "Espera un momento..."
              : modo === "login"
              ? "Entrar a Vestelle"
              : "Crear mi cuenta"}
          </button>
        </form>

        <p style={estilos.nota}>
          Tu cuenta permitirá que tu
          armario pueda estar disponible
          desde tus diferentes dispositivos.
        </p>
      </div>
    </div>
  );
}

const estilos = {
  pantalla: {
    minHeight: "100vh",
    background: "#F8F1E8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
    fontFamily:
      "'DM Sans', Arial, sans-serif",
  },

  cargando: {
    fontFamily:
      "Georgia, 'Times New Roman', serif",
    fontSize: "26px",
    letterSpacing: "3px",
    color: "#493D39",
  },

  contenedorApp: {
    minHeight: "100vh",
    position: "relative",
  },

  tarjeta: {
    width: "100%",
    maxWidth: "430px",
    background: "#FFFCF9",
    border: "1px solid #EADBD2",
    borderRadius: "28px",
    padding: "34px 28px",
    boxSizing: "border-box",
    boxShadow:
      "0 18px 50px rgba(73,61,57,.10)",
  },

  logo: {
    width: "58px",
    height: "58px",
    borderRadius: "50%",
    margin: "0 auto 14px",
    background: "#C88F93",
    color: "#FFFCF9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily:
      "Georgia, 'Times New Roman', serif",
    fontSize: "27px",
  },

  nombreMarca: {
    textAlign: "center",
    fontFamily:
      "Georgia, 'Times New Roman', serif",
    fontSize: "28px",
    letterSpacing: "3px",
    color: "#493D39",
  },

  subtitulo: {
    textAlign: "center",
    color: "#8B7971",
    fontSize: "14px",
    margin:
      "8px 0 28px",
  },

  pestanas: {
    display: "flex",
    gap: "8px",
    marginBottom: "22px",
  },

  pestana: {
    flex: 1,
    border: "none",
    borderBottom:
      "2px solid #EADBD2",
    background: "transparent",
    padding: "11px 4px",
    color: "#493D39",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },

  pestanaActiva: {
    borderBottom:
      "2px solid #C88F93",
  },

  label: {
    display: "block",
    color: "#493D39",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "8px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    border:
      "1px solid #EADBD2",
    borderRadius: "13px",
    background: "#FFFFFF",
    color: "#493D39",
    marginBottom: "17px",
    outline: "none",
    fontSize: "14px",
  },

  mensaje: {
    background: "#F4E8E2",
    color: "#493D39",
    borderRadius: "12px",
    padding: "11px 13px",
    fontSize: "13px",
    lineHeight: 1.45,
    marginBottom: "16px",
  },

  botonPrincipal: {
    width: "100%",
    border: "none",
    borderRadius: "14px",
    background: "#C88F93",
    color: "#FFFFFF",
    padding: "14px 18px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },

  nota: {
    textAlign: "center",
    color: "#8B7971",
    fontSize: "12px",
    lineHeight: 1.5,
    margin:
      "20px 4px 0",
  },

  cuentaWrapper: {
    position: "fixed",
    top: "16px",
    right: "18px",
    zIndex: 9999,
  },

  botonCuenta: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border:
      "2px solid rgba(255,255,255,.85)",
    background: "#C88F93",
    color: "#FFFFFF",
    fontFamily:
      "Georgia, 'Times New Roman', serif",
    fontSize: "18px",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow:
      "0 5px 18px rgba(73,61,57,.16)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  menuCuenta: {
    position: "absolute",
    top: "54px",
    right: "0",
    width: "290px",
    background: "#FFFCF9",
    border:
      "1px solid #EADBD2",
    borderRadius: "18px",
    padding: "18px",
    boxSizing: "border-box",
    boxShadow:
      "0 16px 40px rgba(73,61,57,.18)",
  },

  menuEncabezado: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  avatarGrande: {
    width: "44px",
    height: "44px",
    minWidth: "44px",
    borderRadius: "50%",
    background: "#C88F93",
    color: "#FFFFFF",
    fontFamily:
      "Georgia, 'Times New Roman', serif",
    fontSize: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  infoUsuario: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  tituloCuenta: {
    color: "#493D39",
    fontSize: "14px",
  },

  correoCuenta: {
    color: "#8B7971",
    fontSize: "12px",
    overflowWrap: "anywhere",
  },

  estadoVerificado: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginTop: "16px",
    padding:
      "9px 11px",
    borderRadius: "10px",
    background: "#F2E8DF",
    color: "#6D5D55",
    fontSize: "12px",
  },

  botonCerrar: {
    width: "100%",
    marginTop: "12px",
    border:
      "1px solid #EADBD2",
    borderRadius: "11px",
    background: "#FFFFFF",
    color: "#493D39",
    padding: "11px 13px",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
  },
};

export default AuthGate;