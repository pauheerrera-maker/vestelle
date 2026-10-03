import React, { useEffect, useMemo, useRef, useState } from "react";

import "./App.css";

import { supabase } from "./lib/supabase";



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



  const [looks, setLooks] = useState([]);
  const [lookEditando, setLookEditando] = useState(null);

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



  const [cargandoPrendas, setCargandoPrendas] = useState(true);
  const [cargandoLooks, setCargandoLooks] = useState(true);

  const cargaPrendasIniciada = useRef(false);
  const cargaLooksIniciada = useRef(false);



  /* =====================================================

     COPIA LOCAL

  ===================================================== */



  useEffect(() => {

    try {

      localStorage.setItem(

        "vestelle_prendas",

        JSON.stringify(prendas)

      );

    } catch (error) {

      console.error(

        "No se pudieron guardar las prendas localmente:",

        error

      );

    }

  }, [prendas]);



  /* =====================================================
     CARGAR LOOKS DESDE SUPABASE
  ===================================================== */

  useEffect(() => {
    if (cargaLooksIniciada.current) return;
    if (cargandoPrendas) return;

    cargaLooksIniciada.current = true;
    let activo = true;

    const cargarLooks = async () => {
      setCargandoLooks(true);

      try {
        const { data: usuarioData, error: usuarioError } =
          await supabase.auth.getUser();

        if (usuarioError) throw usuarioError;

        if (!usuarioData?.user) {
          throw new Error("No hay un usuario autenticado.");
        }

        const usuarioId = usuarioData.user.id;

        /*
          Importante: cargamos las prendas directamente desde Supabase
          para no depender de que el estado local `prendas` haya terminado
          de actualizarse cuando se cargan los Looks.
        */
        const { data: filasPrendas, error: errorPrendas } =
          await supabase
            .from("prendas")
            .select("*")
            .eq("user_id", usuarioId)
            .order("created_at", { ascending: false });

        if (errorPrendas) throw errorPrendas;

        const prendasCloud = await Promise.all(
          (filasPrendas || []).map((fila) =>
            convertirFilaPrenda(fila)
          )
        );

        const { data: filasLooks, error: errorLooks } =
          await supabase
            .from("looks")
            .select("id, user_id, nombre, created_at")
            .eq("user_id", usuarioId)
            .order("created_at", { ascending: false });

        if (errorLooks) throw errorLooks;

        const idsLooks = (filasLooks || []).map(
          (look) => look.id
        );

        let relaciones = [];

        if (idsLooks.length > 0) {
          const { data: filasRelaciones, error: errorRelaciones } =
            await supabase
              .from("look_prendas")
              .select("look_id, prenda_id")
              .eq("user_id", usuarioId)
              .in("look_id", idsLooks);

          if (errorRelaciones) throw errorRelaciones;

          relaciones = filasRelaciones || [];
        }

        // Usamos primero las prendas cargadas desde Supabase y, como respaldo,
        // las prendas que ya están en el estado de React. Así el look nunca
        // pierde sus fotos si una URL firmada tarda en generarse.
        const prendasPorId = new Map();

        prendas.forEach((prenda) => {
          prendasPorId.set(prenda.id, prenda);
        });

        prendasCloud.forEach((prenda) => {
          prendasPorId.set(prenda.id, prenda);
        });

        const looksCloud = (filasLooks || []).map((filaLook) => {
          const idsPrendas = relaciones
            .filter(
              (relacion) =>
                relacion.look_id === filaLook.id
            )
            .map(
              (relacion) => relacion.prenda_id
            );

          const prendasDelLook = idsPrendas
            .map((idPrenda) =>
              prendasPorId.get(idPrenda)
            )
            .filter(Boolean);

          return {
            id: filaLook.id,
            nombre: filaLook.nombre || "Mi look",
            prendas: prendasDelLook,
            fecha: filaLook.created_at,
          };
        });

        if (activo) {
          setLooks(looksCloud);
        }
      } catch (error) {
        console.error(
          "ERROR CARGANDO LOOKS DESDE SUPABASE:",
          error
        );

        if (activo) {
          alert(
            `No pudimos cargar tus looks desde la nube.\n\n${
              error?.message || "Error desconocido"
            }`
          );
        }
      } finally {
        if (activo) {
          setCargandoLooks(false);
        }
      }
    };

    cargarLooks();

    return () => {
      activo = false;
    };
  }, [cargandoPrendas]);


  /* =====================================================
     FOTOS DE SUPABASE STORAGE
  ===================================================== */

  const crearUrlFoto = async (imagePath) => {

    if (!imagePath) return "";



    const { data, error } = await supabase.storage

      .from("prendas")

      .createSignedUrl(

        imagePath,

        60 * 60 * 24 * 7

      );



    if (error) {

      console.error(

        "ERROR AL CREAR URL DE FOTO:",

        error

      );



      return "";

    }



    return data?.signedUrl || "";

  };



  const convertirFilaPrenda = async (fila) => {

    return {

      id: fila.id,

      nombre: fila.nombre,

      categoria: fila.categoria,

      color: fila.color || "",

      estilo: fila.estilo || "",

      favorita: Boolean(fila.favorita),

      foto: await crearUrlFoto(fila.image_path),

      imagePath: fila.image_path || "",

      fecha: fila.created_at,

    };

  };



  /* =====================================================

     CARGAR PRENDAS DESDE SUPABASE

  ===================================================== */



  useEffect(() => {

    if (cargaPrendasIniciada.current) return;



    cargaPrendasIniciada.current = true;



    let activo = true;



    const cargarPrendas = async () => {

      setCargandoPrendas(true);



      try {

        const {

          data: usuarioData,

          error: usuarioError,

        } = await supabase.auth.getUser();



        if (usuarioError) {

          console.error(

            "ERROR AL OBTENER USUARIO:",

            usuarioError

          );



          if (activo) {

            setCargandoPrendas(false);

          }



          return;

        }



        if (!usuarioData?.user) {

          console.error(

            "NO HAY USUARIO AUTENTICADO."

          );



          if (activo) {

            setCargandoPrendas(false);

          }



          return;

        }



        const usuarioId = usuarioData.user.id;



        const {

          data: filas,

          error,

        } = await supabase

          .from("prendas")

          .select("*")

          .eq("user_id", usuarioId)

          .order("created_at", {

            ascending: false,

          });



        if (error) {

          console.error(

            "ERROR AL CONSULTAR TABLA PRENDAS:",

            error

          );



          if (activo) {

            setCargandoPrendas(false);

          }



          return;

        }



        const prendasLocales = (() => {

          try {

            const guardadas =

              localStorage.getItem(

                "vestelle_prendas"

              );



            return guardadas

              ? JSON.parse(guardadas)

              : [];

          } catch {

            return [];

          }

        })();



        let filasFinales = filas || [];



        /* =================================================

           MIGRACIÓN DE PRENDAS LOCALES

        ================================================= */



        if (

          filasFinales.length === 0 &&

          prendasLocales.length > 0

        ) {

          console.log(

            "Supabase está vacío. Intentando migrar prendas locales..."

          );



          for (

            const prendaLocal of prendasLocales

          ) {

            try {

              if (!prendaLocal.foto) {

                continue;

              }



              const imagePath =

                `${usuarioId}/legacy-${prendaLocal.id}.jpg`;



              const {

                data: existente,

                error: errorExistente,

              } = await supabase

                .from("prendas")

                .select("*")

                .eq("user_id", usuarioId)

                .eq(

                  "image_path",

                  imagePath

                )

                .maybeSingle();



              if (errorExistente) {

                console.error(

                  "ERROR BUSCANDO PRENDA LOCAL EXISTENTE:",

                  errorExistente

                );

              }



              if (existente) {

                filasFinales.push(

                  existente

                );



                continue;

              }



              const respuestaFoto =

                await fetch(

                  prendaLocal.foto

                );



              if (!respuestaFoto.ok) {

                throw new Error(

                  "No se pudo convertir la foto local."

                );

              }



              const blobFoto =

                await respuestaFoto.blob();



              const {

                error: errorUpload,

              } = await supabase.storage

                .from("prendas")

                .upload(

                  imagePath,

                  blobFoto,

                  {

                    contentType:

                      "image/jpeg",

                    upsert: true,

                  }

                );



              if (errorUpload) {

                console.error(

                  "ERROR MIGRANDO FOTO:",

                  errorUpload

                );



                continue;

              }



              const {

                data: filaNueva,

                error: errorInsert,

              } = await supabase

                .from("prendas")

                .insert({

                  user_id: usuarioId,

                  nombre:

                    prendaLocal.nombre,

                  categoria:

                    prendaLocal.categoria,

                  color:

                    prendaLocal.color ||

                    null,

                  estilo:

                    prendaLocal.estilo ||

                    null,

                  favorita:

                    Boolean(

                      prendaLocal.favorita

                    ),

                  image_path:

                    imagePath,

                })

                .select()

                .single();



              if (errorInsert) {

                console.error(

                  "ERROR MIGRANDO REGISTRO:",

                  errorInsert

                );



                continue;

              }



              filasFinales.push(

                filaNueva

              );

            } catch (errorMigracion) {

              console.error(

                "ERROR GENERAL MIGRANDO PRENDA:",

                errorMigracion

              );

            }

          }

        }



        const prendasCloud =

          await Promise.all(

            filasFinales.map(

              (fila) =>

                convertirFilaPrenda(

                  fila

                )

            )

          );



        if (activo) {

          setPrendas(

            prendasCloud

          );

        }

      } catch (error) {

        console.error(

          "ERROR GENERAL CARGANDO PRENDAS:",

          error

        );

      } finally {

        if (activo) {

          setCargandoPrendas(false);

        }

      }

    };



    cargarPrendas();



    return () => {

      activo = false;

    };

  }, []);



  /* =====================================================

     PROCESAR FOTO

  ===================================================== */



  const procesarImagen = (archivo) => {

    if (!archivo) return;



    const lector =

      new FileReader();



    lector.onload = (evento) => {

      const imagen =

        new Image();



      imagen.onload = () => {

        const canvas =

          document.createElement(

            "canvas"

          );



        const maximo = 900;



        let ancho =

          imagen.width;



        let alto =

          imagen.height;



        if (

          ancho > maximo ||

          alto > maximo

        ) {

          if (

            ancho > alto

          ) {

            alto =

              Math.round(

                (alto *

                  maximo) /

                  ancho

              );



            ancho =

              maximo;

          } else {

            ancho =

              Math.round(

                (ancho *

                  maximo) /

                  alto

              );



            alto =

              maximo;

          }

        }



        canvas.width =

          ancho;



        canvas.height =

          alto;



        const contexto =

          canvas.getContext(

            "2d"

          );



        contexto.drawImage(

          imagen,

          0,

          0,

          ancho,

          alto

        );



        const imagenComprimida =

          canvas.toDataURL(

            "image/jpeg",

            0.82

          );



        setFoto(

          imagenComprimida

        );

      };



      imagen.src =

        evento.target.result;

    };



    lector.readAsDataURL(

      archivo

    );

  };



  /* =====================================================

     FORMULARIO

  ===================================================== */



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

     GUARDAR PRENDA — DIAGNÓSTICO DETALLADO

  ===================================================== */



  const guardarPrenda = async () => {

    if (!nombre.trim()) {

      alert(

        "Escribe un nombre para la prenda."

      );

      return;

    }



    if (!foto) {

      alert(

        "Agrega una foto de la prenda."

      );

      return;

    }



    try {

      console.log(

        "========== VESTELLE: GUARDAR PRENDA =========="

      );



      /* ---------------------------------------------

         PASO 1 — USUARIO

      --------------------------------------------- */



      console.log(

        "PASO 1: verificando usuario..."

      );



      const {

        data: usuarioData,

        error: usuarioError,

      } = await supabase.auth.getUser();



      if (usuarioError) {

        console.error(

          "ERROR PASO 1:",

          usuarioError

        );



        throw new Error(

          `PASO 1 - Error obteniendo usuario: ${

            usuarioError.message ||

            "Error desconocido"

          }`

        );

      }



      if (!usuarioData?.user) {

        throw new Error(

          "PASO 1 - No hay un usuario autenticado."

        );

      }



      const usuarioId =

        usuarioData.user.id;



      console.log(

        "Usuario encontrado:",

        usuarioId

      );



      /* ---------------------------------------------

         PASO 2 — CONVERTIR FOTO

      --------------------------------------------- */



      console.log(

        "PASO 2: preparando foto..."

      );



      const respuestaFoto =

        await fetch(foto);



      if (!respuestaFoto.ok) {

        throw new Error(

          `PASO 2 - No se pudo preparar la foto. Estado: ${respuestaFoto.status}`

        );

      }



      const blobFoto =

        await respuestaFoto.blob();



      console.log(

        "Foto preparada:",

        blobFoto.size,

        "bytes"

      );



      /* ---------------------------------------------

         PASO 3 — STORAGE

      --------------------------------------------- */



      console.log(

        "PASO 3: subiendo foto a Storage..."

      );



      const imagePath =

        `${usuarioId}/${crypto.randomUUID()}.jpg`;



      console.log(

        "Ruta de Storage:",

        imagePath

      );



      const {

        data: storageData,

        error: errorUpload,

      } = await supabase.storage

        .from("prendas")

        .upload(

          imagePath,

          blobFoto,

          {

            contentType:

              "image/jpeg",

            upsert: false,

          }

        );



      if (errorUpload) {

        console.error(

          "ERROR PASO 3 — STORAGE:",

          errorUpload

        );



        throw new Error(

          `PASO 3 - Error subiendo la foto a Storage.\n\nMensaje: ${

            errorUpload.message ||

            "Sin mensaje"

          }\nCódigo: ${

            errorUpload.statusCode ||

            errorUpload.status ||

            "Sin código"

          }`

        );

      }



      console.log(

        "Foto subida correctamente:",

        storageData

      );



      /* ---------------------------------------------

         PASO 4 — TABLA PRENDAS

      --------------------------------------------- */



      console.log(

        "PASO 4: guardando registro en public.prendas..."

      );



      const {

        data: filaNueva,

        error: errorInsert,

      } = await supabase

        .from("prendas")

        .insert({

          user_id: usuarioId,

          nombre:

            nombre.trim(),

          categoria,

          color,

          estilo,

          favorita,

          image_path:

            imagePath,

        })

        .select()

        .single();



      if (errorInsert) {

        console.error(

          "ERROR PASO 4 — TABLA PRENDAS:",

          errorInsert

        );



        /*

         * Si la foto sí alcanzó a subir,

         * intentamos eliminarla porque

         * el registro no se pudo crear.

         */



        await supabase.storage

          .from("prendas")

          .remove([

            imagePath,

          ]);



        throw new Error(

          `PASO 4 - Error guardando la prenda en la tabla.\n\nMensaje: ${

            errorInsert.message ||

            "Sin mensaje"

          }\nCódigo: ${

            errorInsert.code ||

            "Sin código"

          }\nDetalles: ${

            errorInsert.details ||

            "Sin detalles"

          }\nSugerencia: ${

            errorInsert.hint ||

            "Sin sugerencia"

          }`

        );

      }



      console.log(

        "Registro creado correctamente:",

        filaNueva

      );



      /* ---------------------------------------------

         PASO 5 — URL DE LA FOTO

      --------------------------------------------- */



      console.log(

        "PASO 5: generando URL de la foto..."

      );



      const fotoUrl =

        await crearUrlFoto(

          imagePath

        );



      if (!fotoUrl) {

        console.warn(

          "La prenda se guardó, pero no se pudo generar la URL de visualización."

        );

      }



      /* ---------------------------------------------

         PASO 6 — ACTUALIZAR INTERFAZ

      --------------------------------------------- */



      const nuevaPrenda = {

        id: filaNueva.id,

        nombre:

          filaNueva.nombre,

        categoria:

          filaNueva.categoria,

        color:

          filaNueva.color || "",

        estilo:

          filaNueva.estilo || "",

        favorita:

          Boolean(

            filaNueva.favorita

          ),

        foto: fotoUrl,

        imagePath:

          imagePath,

        fecha:

          filaNueva.created_at,

      };



      setPrendas(

        (prev) => [

          nuevaPrenda,

          ...prev,

        ]

      );



      cerrarFormulario();



      console.log(

        "========== PRENDA GUARDADA CORRECTAMENTE =========="

      );

    } catch (error) {

      console.error(

        "========== ERROR FINAL VESTELLE =========="

      );



      console.error(

        error

      );



      alert(

        error?.message ||

          "No pudimos guardar la prenda."

      );

    }

  };



  /* =====================================================

     FAVORITA

  ===================================================== */



  const alternarFavorita =

    async (id) => {

      const prenda =

        prendas.find(

          (item) =>

            item.id === id

        );



      if (!prenda) return;



      const nuevaFavorita =

        !prenda.favorita;



      const {

        error,

      } = await supabase

        .from("prendas")

        .update({

          favorita:

            nuevaFavorita,

        })

        .eq("id", id);



      if (error) {

        console.error(

          "ERROR ACTUALIZANDO FAVORITA:",

          error

        );



        alert(

          `No pudimos actualizar la favorita.\n\n${error.message}`

        );



        return;

      }



      setPrendas(

        (prev) =>

          prev.map(

            (item) =>

              item.id === id

                ? {

                    ...item,

                    favorita:

                      nuevaFavorita,

                  }

                : item

          )

      );



      if (

        prendaSeleccionada?.id ===

        id

      ) {

        setPrendaSeleccionada(

          (actual) =>

            actual

              ? {

                  ...actual,

                  favorita:

                    nuevaFavorita,

                }

              : actual

        );

      }

    };



  /* =====================================================

     ELIMINAR PRENDA

  ===================================================== */



  const eliminarPrenda =

    async (id) => {

      const confirmar =

        window.confirm(

          "¿Quieres eliminar esta prenda de tu armario?"

        );



      if (!confirmar) return;



      const prenda =

        prendas.find(

          (item) =>

            item.id === id

        );



      const {

        error,

      } = await supabase

        .from("prendas")

        .delete()

        .eq("id", id);



      if (error) {

        console.error(

          "ERROR ELIMINANDO PRENDA:",

          error

        );



        alert(

          `No pudimos eliminar la prenda.\n\n${error.message}`

        );



        return;

      }



      if (

        prenda?.imagePath

      ) {

        const {

          error: errorFoto,

        } = await supabase.storage

          .from("prendas")

          .remove([

            prenda.imagePath,

          ]);



        if (errorFoto) {

          console.error(

            "ERROR ELIMINANDO FOTO:",

            errorFoto

          );

        }

      }



      setPrendas(

        (prev) =>

          prev.filter(

            (item) =>

              item.id !== id

          )

      );



      setPrendaSeleccionada(

        null

      );



      setSeleccionesLook(

        (prev) => {

          const nuevas = {

            ...prev,

          };



          Object.keys(

            nuevas

          ).forEach(

            (cat) => {

              if (

                nuevas[cat]

                  ?.id === id

              ) {

                nuevas[cat] =

                  null;

              }

            }

          );



          return nuevas;

        }

      );

    };



  /* =====================================================

     FILTROS

  ===================================================== */



  const prendasFiltradas =

    useMemo(() => {

      if (

        categoriaActiva ===

        "Todo"

      ) {

        return prendas;

      }



      return prendas.filter(

        (prenda) =>

          prenda.categoria ===

          categoriaActiva

      );

    }, [

      prendas,

      categoriaActiva,

    ]);



  /* =====================================================

     LOOKS

  ===================================================== */



  const seleccionarParaLook = (

    categoriaLook,

    prenda

  ) => {

    setSeleccionesLook(

      (prev) => ({

        ...prev,

        [categoriaLook]:

          prev[categoriaLook]

            ?.id === prenda.id

            ? null

            : prenda,

      })

    );



    setModoAleatorio(false);

  };



  const quitarDelLook = (

    categoriaLook

  ) => {

    setSeleccionesLook(

      (prev) => ({

        ...prev,

        [categoriaLook]:

          null,

      })

    );

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



  const elegirAleatoriamente =

    () => {

      if (prendas.length < 2) {

        alert(

          "Necesitas al menos 2 prendas para crear un look."

        );

        return;

      }



      const porCategoria =

        (cat) =>

          prendas.filter(

            (prenda) =>

              prenda.categoria ===

              cat

          );



      const tops =

        porCategoria("Tops");



      const pantalones =

        porCategoria(

          "Pantalones"

        );



      const faldas =

        porCategoria("Faldas");



      const vestidos =

        porCategoria(

          "Vestidos"

        );



      const zapatos =

        porCategoria("Zapatos");



      const accesorios =

        porCategoria(

          "Accesorios"

        );



      const aleatorio =

        (lista) => {

          if (!lista.length)

            return null;



          return lista[

            Math.floor(

              Math.random() *

                lista.length

            )

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



      if (

        vestidos.length > 0 &&

        Math.random() > 0.45

      ) {

        nuevoLook.Vestidos =

          aleatorio(

            vestidos

          );

      } else {

        if (

          tops.length > 0

        ) {

          nuevoLook.Tops =

            aleatorio(

              tops

            );

        }



        if (

          pantalones.length >

            0 &&

          Math.random() > 0.5

        ) {

          nuevoLook.Pantalones =

            aleatorio(

              pantalones

            );

        } else if (

          faldas.length > 0

        ) {

          nuevoLook.Faldas =

            aleatorio(

              faldas

            );

        } else if (

          pantalones.length >

          0

        ) {

          nuevoLook.Pantalones =

            aleatorio(

              pantalones

            );

        }

      }



      if (

        zapatos.length > 0

      ) {

        nuevoLook.Zapatos =

          aleatorio(

            zapatos

          );

      }



      if (

        accesorios.length >

          0 &&

        Math.random() > 0.35

      ) {

        nuevoLook.Accesorios =

          aleatorio(

            accesorios

          );

      }



      setSeleccionesLook(

        nuevoLook

      );



      setNombreLook(

        "Look sorpresa"

      );



      setModoAleatorio(true);

    };



  const prendasSeleccionadas =

    Object.values(

      seleccionesLook

    ).filter(Boolean);



  const guardarLook = async () => {
    if (prendasSeleccionadas.length < 2) {
      alert("Selecciona al menos 2 prendas para guardar el look.");
      return;
    }

    try {
      const { data: usuarioData, error: usuarioError } =
        await supabase.auth.getUser();

      if (usuarioError) throw usuarioError;
      if (!usuarioData?.user) {
        throw new Error("No hay un usuario autenticado.");
      }

      const usuarioId = usuarioData.user.id;

      const { data: filaLook, error: errorLook } =
        await supabase
          .from("looks")
          .insert({
            user_id: usuarioId,
            nombre: nombreLook.trim() || "Mi look",
          })
          .select()
          .single();

      if (errorLook) throw errorLook;

      const relaciones = prendasSeleccionadas.map((prenda) => ({
        user_id: usuarioId,
        look_id: filaLook.id,
        prenda_id: prenda.id,
      }));

      const { error: errorRelaciones } = await supabase
        .from("look_prendas")
        .insert(relaciones);

      if (errorRelaciones) {
        await supabase.from("looks").delete().eq("id", filaLook.id);
        throw errorRelaciones;
      }

      const nuevoLook = {
        id: filaLook.id,
        nombre: filaLook.nombre,
        // Copiamos las prendas para que limpiarLook() no afecte el look guardado.
        prendas: prendasSeleccionadas.map((prenda) => ({ ...prenda })),
        fecha: filaLook.created_at,
      };

      setLooks((prev) => [nuevoLook, ...prev]);
      alert("¡Look guardado en tu colección! ✨");
      limpiarLook();
    } catch (error) {
      console.error("ERROR GUARDANDO LOOK EN SUPABASE:", error);

      alert(
        `No pudimos guardar el look.\n\n${
          error?.message || "Error desconocido"
        }`
      );
    }
  };

  const eliminarLook = async (id) => {
    const confirmar = window.confirm(
      "¿Quieres eliminar este look guardado?"
    );

    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from("looks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setLooks((prev) => prev.filter((look) => look.id !== id));
    } catch (error) {
      console.error("ERROR ELIMINANDO LOOK:", error);

      alert(
        `No pudimos eliminar el look.\n\n${
          error?.message || "Error desconocido"
        }`
      );
    }
  };

  const abrirEditorLook = (look) => {
    const nuevasSelecciones = {
      Tops: null,
      Pantalones: null,
      Faldas: null,
      Vestidos: null,
      Zapatos: null,
      Accesorios: null,
    };

    look.prendas.forEach((prenda) => {
      if (Object.prototype.hasOwnProperty.call(nuevasSelecciones, prenda.categoria)) {
        nuevasSelecciones[prenda.categoria] = { ...prenda };
      }
    });

    setLookEditando(look);
    setSeleccionesLook(nuevasSelecciones);
    setNombreLook(look.nombre || "Mi look");
    setModoAleatorio(false);
  };

  const cancelarEdicionLook = () => {
    setLookEditando(null);
    limpiarLook();
  };

  const guardarEdicionLook = async () => {
    if (!lookEditando) return;

    if (prendasSeleccionadas.length < 2) {
      alert("Selecciona al menos 2 prendas para guardar el look.");
      return;
    }

    try {
      const nombreActualizado = nombreLook.trim() || "Mi look";

      const { error: errorLook } = await supabase
        .from("looks")
        .update({ nombre: nombreActualizado })
        .eq("id", lookEditando.id);

      if (errorLook) throw errorLook;

      const { error: errorEliminarRelaciones } = await supabase
        .from("look_prendas")
        .delete()
        .eq("look_id", lookEditando.id);

      if (errorEliminarRelaciones) throw errorEliminarRelaciones;

      const { data: usuarioData, error: usuarioError } =
        await supabase.auth.getUser();

      if (usuarioError) throw usuarioError;
      if (!usuarioData?.user) {
        throw new Error("No hay un usuario autenticado.");
      }

      const relaciones = prendasSeleccionadas.map((prenda) => ({
        user_id: usuarioData.user.id,
        look_id: lookEditando.id,
        prenda_id: prenda.id,
      }));

      const { error: errorRelaciones } = await supabase
        .from("look_prendas")
        .insert(relaciones);

      if (errorRelaciones) throw errorRelaciones;

      setLooks((prev) =>
        prev.map((look) =>
          look.id === lookEditando.id
            ? {
                ...look,
                nombre: nombreActualizado,
                prendas: prendasSeleccionadas.map((prenda) => ({ ...prenda })),
              }
            : look
        )
      );

      alert("¡Look actualizado! ✨");
      setLookEditando(null);
      limpiarLook();
    } catch (error) {
      console.error("ERROR ACTUALIZANDO LOOK EN SUPABASE:", error);

      alert(
        `No pudimos actualizar el look.\n\n${
          error?.message || "Error desconocido"
        }`
      );
    }
  };

  /* =====================================================

     TABLERO DE LOOK

  ===================================================== */



  const renderLookBoard = () => {

    const top =

      seleccionesLook.Tops;



    const bottom =

      seleccionesLook.Pantalones ||

      seleccionesLook.Faldas;



    const dress =

      seleccionesLook.Vestidos;



    const shoes =

      seleccionesLook.Zapatos;



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

          {dress && (

            <div className="board-item board-dress">

              <button

                className="board-remove"

                type="button"

                onClick={() =>

                  quitarDelLook(

                    "Vestidos"

                  )

                }

              >

                ×

              </button>



              <img

                src={dress.foto}

                alt={dress.nombre}

              />



              <span>

                {dress.nombre}

              </span>

            </div>

          )}



          {!dress && (

            <div className="board-top-bottom">

              {top && (

                <div className="board-item board-top">

                  <button

                    className="board-remove"

                    type="button"

                    onClick={() =>

                      quitarDelLook(

                        "Tops"

                      )

                    }

                  >

                    ×

                  </button>



                  <img

                    src={top.foto}

                    alt={top.nombre}

                  />



                  <span>

                    {top.nombre}

                  </span>

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



          {(shoes ||

            accessory) && (

            <div className="board-accessories">

              {shoes && (

                <div className="board-item board-small">

                  <button

                    className="board-remove"

                    type="button"

                    onClick={() =>

                      quitarDelLook(

                        "Zapatos"

                      )

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

                      quitarDelLook(

                        "Accesorios"

                      )

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

    const favoritas =

      prendas.filter(

        (prenda) =>

          prenda.favorita

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

            onClick={

              abrirFormulario

            }

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

                setActiveTab(

                  "armario"

                )

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

                onClick={

                  abrirFormulario

                }

              >

                Añadir mi primera prenda

              </button>

            </div>

          ) : (

            <div className="mini-grid">

              {prendas

                .slice(0, 4)

                .map(

                  (prenda) => (

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

                        src={

                          prenda.foto

                        }

                        alt={

                          prenda.nombre

                        }

                      />



                      <span>

                        {

                          prenda.nombre

                        }

                      </span>

                    </button>

                  )

                )}

            </div>

          )}

        </div>



        <div className="home-buttons">

          <button

            className="feature-card"

            onClick={() =>

              setActiveTab(

                "looks"

              )

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

              setActiveTab(

                "looks"

              );



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

              {cargandoPrendas

                ? "Cargando tu colección..."

                : prendas.length === 0

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

            onClick={

              abrirFormulario

            }

          >

            + Añadir prenda

          </button>

        </div>



        <div className="category-tabs">

          {CATEGORIAS.map(

            (cat) => (

              <button

                key={cat}

                className={

                  categoriaActiva ===

                  cat

                    ? "active"

                    : ""

                }

                onClick={() =>

                  setCategoriaActiva(

                    cat

                  )

                }

              >

                {cat}

              </button>

            )

          )}

        </div>



        {prendasFiltradas.length ===

        0 ? (

          <div className="empty-state">

            <div className="empty-icon">

              ♡

            </div>



            <h3>

              {cargandoPrendas

                ? "Cargando tu armario..."

                : "No hay prendas aquí"}

            </h3>



            {!cargandoPrendas && (

              <>

                <p>

                  Agrega una prenda o cambia

                  la categoría.

                </p>



                <button

                  className="secondary-button"

                  onClick={

                    abrirFormulario

                  }

                >

                  Añadir prenda

                </button>

              </>

            )}

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

                    type="button"

                  >

                    <img

                      src={

                        prenda.foto

                      }

                      alt={

                        prenda.nombre

                      }

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

                        {

                          prenda.nombre

                        }

                      </h3>



                      <p>

                        {

                          prenda.color

                        }{" "}

                        ·{" "}

                        {

                          prenda.estilo

                        }

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

              onClick={

                abrirFormulario

              }

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

            onClick={

              elegirAleatoriamente

            }

          >

            ✦ Elige por mí

          </button>



          <button

            className="text-button"

            onClick={

              limpiarLook

            }

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

            onClick={

              guardarLook

            }

          >

            Guardar look

          </button>

        </div>



        <style>{`
          .saved-looks { margin-top: 34px; padding-top: 30px; border-top: 1px solid rgba(73,61,57,.12); }
          .saved-looks .section-heading { margin-bottom: 18px; }
          .saved-looks .section-heading small { display:block; margin-bottom:5px; color:#8B7971; font-size:10px; letter-spacing:.18em; font-weight:700; }
          .saved-looks .section-heading h2 { margin:0; color:#493D39; }
          .saved-look { position:relative; margin:0 0 20px; padding:18px; overflow:hidden; border:1px solid rgba(73,61,57,.10); border-radius:24px; background:linear-gradient(145deg,#fffaf5 0%,#f8f1e8 100%); box-shadow:0 12px 30px rgba(73,61,57,.08); cursor:pointer; transition:transform .2s ease, box-shadow .2s ease; }
          .saved-look:hover { transform:translateY(-2px); box-shadow:0 16px 34px rgba(73,61,57,.12); }
          .saved-look::before { content:""; position:absolute; top:0; left:0; right:0; height:4px; background:#C88F93; }
          .saved-look-header { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:16px; }
          .saved-look-header small { color:#C88F93; font-size:9px; letter-spacing:.18em; font-weight:800; }
          .saved-look-header h3 { margin:4px 0 0; color:#493D39; font-family:Georgia,serif; font-size:22px; font-weight:500; }
          .saved-look-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
          .saved-look .edit-button, .saved-look .delete-button { padding:8px 12px; border:1px solid rgba(73,61,57,.14); border-radius:999px; background:rgba(255,255,255,.72); color:#8B7971; font-size:11px; }
          .saved-look .edit-button { color:#493D39; }
          .saved-look-editor { margin:0 0 24px; padding:20px; border:1px solid rgba(200,143,147,.35); border-radius:24px; background:#fffaf5; box-shadow:0 10px 28px rgba(73,61,57,.07); }
          .saved-look-editor small { display:block; margin-bottom:6px; color:#C88F93; font-size:9px; letter-spacing:.18em; font-weight:800; }
          .saved-look-editor h3 { margin:0 0 14px; color:#493D39; font-family:Georgia,serif; font-size:24px; font-weight:500; }
          .saved-look-editor input { width:100%; box-sizing:border-box; margin-bottom:14px; }
          .saved-look-editor-actions { display:flex; gap:10px; }
          .saved-look-editor-actions button { flex:1; }
          .saved-look-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
          .saved-look-item { min-width:0; overflow:hidden; border:1px solid rgba(73,61,57,.08); border-radius:16px; background:#fffdf9; }
          .saved-look-item img, .saved-look-image-placeholder { display:block; width:100%; height:150px; object-fit:cover; background:#eadbd2; }
          .saved-look-image-placeholder { display:flex; align-items:center; justify-content:center; color:#C88F93; font-size:28px; }
          .saved-look-item > span { display:block; padding:9px 10px 11px; overflow:hidden; color:#493D39; font-size:11px; line-height:1.25; text-overflow:ellipsis; white-space:nowrap; }
          @media (max-width:480px) { .saved-look { padding:15px; border-radius:21px; } .saved-look-grid { gap:8px; } .saved-look-item img, .saved-look-image-placeholder { height:132px; } .saved-look-header h3 { font-size:20px; } .saved-look-header { align-items:flex-start; } .saved-look-actions { flex-direction:column; align-items:stretch; } .saved-look .edit-button, .saved-look .delete-button { white-space:nowrap; } .saved-look-editor-actions { flex-direction:column; } }
        `}</style>

        {lookEditando && (
          <div className="saved-look-editor">
            <small>EDITAR LOOK</small>
            <h3>Modifica tu combinación</h3>

            <input
              type="text"
              value={nombreLook}
              onChange={(e) => setNombreLook(e.target.value)}
              placeholder="Nombre del look"
            />

            {renderLookBoard()}

            <div className="saved-look-editor-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={cancelarEdicionLook}
              >
                Cancelar
              </button>
              <button
                className="primary-button"
                type="button"
                onClick={guardarEdicionLook}
              >
                Guardar cambios
              </button>
            </div>
          </div>
        )}

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



            {looks.map(

              (look) => (

                <article

                  className="saved-look"

                  key={look.id}

                  onClick={() => abrirEditorLook(look)}

                  role="button"

                  tabIndex={0}

                  onKeyDown={(evento) => {
                    if (evento.key === "Enter" || evento.key === " ") {
                      evento.preventDefault();
                      abrirEditorLook(look);
                    }
                  }}

                >

                  <div className="saved-look-header">

                    <div>

                      <small>

                        LOOK

                      </small>



                      <h3>

                        {

                          look.nombre

                        }

                      </h3>

                    </div>



                    <div className="saved-look-actions">

                      <button

                        className="edit-button"

                        onClick={(evento) => {
                          evento.stopPropagation();
                          abrirEditorLook(look);
                        }}

                        type="button"

                      >

                        Editar

                      </button>

                      <button

                        className="delete-button"

                        onClick={(evento) => {
                          evento.stopPropagation();
                          eliminarLook(look.id);
                        }}

                        type="button"

                      >

                        Eliminar

                      </button>

                    </div>

                  </div>



                  <div className="saved-look-grid">

                    {look.prendas.map(

                      (prenda) => (

                        <div

                          className="saved-look-item"

                          key={

                            prenda.id

                          }

                        >

                          {prenda.foto ? (
                            <img
                              src={prenda.foto}
                              alt={prenda.nombre}
                              onError={(evento) => {
                                evento.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="saved-look-image-placeholder">
                              <span>✦</span>
                            </div>
                          )}



                          <span>

                            {

                              prenda.nombre

                            }

                          </span>

                        </div>

                      )

                    )}

                  </div>

                </article>

              )

            )}

          </div>

        )}


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

                    prenda.categoria ===

                    cat

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

                            key={

                              prenda.id

                            }

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

                            type="button"

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

                              {

                                prenda.nombre

                              }

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





      </section>

    );

  };



  /* =====================================================

     CALENDARIO

  ===================================================== */



  const renderCalendario = () => (

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



  /* =====================================================

     MÁS

  ===================================================== */



  const renderMas = () => (

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

              {looks.length}{" "}

              looks guardados

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

              onClick={

                cerrarFormulario

              }

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

                procesarImagen(

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

                {COLORES.map(

                  (c) => (

                    <option

                      key={c}

                      value={c}

                    >

                      {c}

                    </option>

                  )

                )}

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

                {ESTILOS.map(

                  (e) => (

                    <option

                      key={e}

                      value={e}

                    >

                      {e}

                    </option>

                  )

                )}

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

              onClick={

                cerrarFormulario

              }

              type="button"

            >

              Cancelar

            </button>



            <button

              className="primary-button"

              onClick={

                guardarPrenda

              }

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

              type="button"

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

              type="button"

            >

              Eliminar prenda

            </button>

          </div>

        </div>

      </div>

    );

  };



  /* =====================================================

     CONTENIDO

  ===================================================== */



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

            setActiveTab("inicio")

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

          onClick={

            abrirFormulario

          }

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

            activeTab ===

            "inicio"

              ? "active"

              : ""

          }

          onClick={() =>

            setActiveTab(

              "inicio"

            )

          }

          type="button"

        >

          <span>

            ⌂

          </span>



          <small>

            Inicio

          </small>

        </button>



        <button

          className={

            activeTab ===

            "armario"

              ? "active"

              : ""

          }

          onClick={() =>

            setActiveTab(

              "armario"

            )

          }

          type="button"

        >

          <span>

            ♧

          </span>



          <small>

            Armario

          </small>

        </button>



        <button

          className={

            activeTab ===

            "looks"

              ? "active"

              : ""

          }

          onClick={() =>

            setActiveTab(

              "looks"

            )

          }

          type="button"

        >

          <span>

            ✦

          </span>



          <small>

            Looks

          </small>

        </button>



        <button

          className={

            activeTab ===

            "calendario"

              ? "active"

              : ""

          }

          onClick={() =>

            setActiveTab(

              "calendario"

            )

          }

          type="button"

        >

          <span>

            □

          </span>



          <small>

            Calendario

          </small>

        </button>



        <button

          className={

            activeTab ===

            "mas"

              ? "active"

              : ""

          }

          onClick={() =>

            setActiveTab("mas")

          }

          type="button"

        >

          <span>

            •••

          </span>



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