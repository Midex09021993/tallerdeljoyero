      const { data: authData, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw new Error("Usuario o contraseña incorrectos");

      // Resolver primero el estado de acceso para mostrar un mensaje útil
      // antes de que useSesion() cierre la sesión de un perfil vencido.
      if (authData.user) {
        const { data: perfilAcceso } = await supabase
          .from("profiles")
          .select("activo, acceso_desde, acceso_hasta")
          .eq("id", authData.user.id)
          .maybeSingle();

        const hoy = new Date().toISOString().slice(0, 10);

        if (perfilAcceso?.acceso_hasta && hoy > perfilAcceso.acceso_hasta) {
          await supabase.auth.signOut();
          const [anio, mes, dia] = perfilAcceso.acceso_hasta.split("-");
          throw new Error(
            `Tu acceso a Aurum Lab ha vencido el ${dia}/${mes}/${anio}. Contacta con el administrador para renovarlo.`,
          );
        }
      }

      await qc.invalidateQueries();
      const { data: sesionActualizada, error: errorSesion } = await refetchSesion();
      if (errorSesion || !sesionActualizada) {
        throw new Error("La sesión se creó, pero no se pudo resolver el acceso al taller");
      }
