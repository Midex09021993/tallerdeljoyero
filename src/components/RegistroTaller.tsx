import { useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Building2, Eye, EyeOff, MapPin, Mail, Phone, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { registrarTaller } from "@/lib/cuentas.functions";
import { registrarEvento } from "@/lib/analytics";

type Props = {
  className?: string;
};

export function RegistroTaller({ className = "" }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [creado, setCreado] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [codigoPais, setCodigoPais] = useState("+51");
  const [form, setForm] = useState({
    nombre: "",
    taller: "",
    email: "",
    telefono: "",
    ciudad: "",
    pais: "Perú",
    password: "",
  });

  function cerrar() {
    if (cargando) return;
    setAbierto(false);
    setCreado(false);
    setCorreoEnviado(false);
    setError("");
  }

  async function registrar(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    let tallerCreado = false;

    try {
      const telefonoNormalizado = form.telefono.replace(/\D/g, "");
      const resultado = await registrarTaller({ data: { ...form, telefono: telefonoNormalizado ? `${codigoPais}${telefonoNormalizado}` : "" } });
      tallerCreado = true;
      registrarEvento("registration_completed", { source: "public_workshop_form" });
      setCorreoEnviado(resultado.correoEnviado === true);
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: resultado.email,
        password: form.password,
      });

      if (loginError) throw new Error("El taller se creó, pero no se pudo iniciar la sesión automáticamente.");
      setCreado(true);
      const importTransfer = new URLSearchParams(window.location.search).get("importTransfer");
      window.setTimeout(() => {
        if (importTransfer && /^[A-Za-z0-9_-]{30,100}$/.test(importTransfer)) {
          window.location.href = `/mi-nube?importTransfer=${encodeURIComponent(importTransfer)}`;
        } else {
          window.location.href = "/inicio";
        }
      }, 450);
    } catch (e2) {
      if (!tallerCreado) registrarEvento("registration_failed", { source: "public_workshop_form" });
      setError(e2 instanceof Error ? e2.message : "No se pudo crear el taller.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAbierto(true);
          registrarEvento("registration_started", { source: "public_workshop_form" });
          setCreado(false);
          setCorreoEnviado(false);
          setError("");
        }}
        className={className || "inline-flex items-center gap-2 rounded-lg border border-gold/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-gold transition hover:bg-gold/10"}
      >
        Crear mi taller
      </button>

      {abierto ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-[#17232d]/55 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="registro-taller-title">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#e8dfca] bg-white p-6 shadow-[0_28px_90px_rgba(23,35,45,.22)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#987400]">Aurum Lab · Tu taller</p>
                <h2 id="registro-taller-title" className="mt-2 text-2xl font-extrabold tracking-tight text-[#17232d]">Crea tu taller</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Un solo registro. Aurum crea tu taller, tu cuenta y tu acceso automáticamente.
                </p>
              </div>
              <button type="button" onClick={cerrar} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#17232d]" aria-label="Cerrar">
                <X className="size-5" />
              </button>
            </div>

            {creado ? (
              <div className="mt-8 rounded-2xl border border-[#eadca8] bg-[#fffaf0] p-6 text-center">
                <Building2 className="mx-auto size-8 text-gold" />
                <p className="mt-3 text-lg font-semibold text-gold">Tu taller está listo</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {correoEnviado
                    ? "Tu cuenta y tu taller fueron creados. También enviamos a tu correo el acceso y el enlace para entrar."
                    : "Tu cuenta y tu taller fueron creados. Puedes entrar ahora; el correo de bienvenida quedó pendiente de configuración de envío."}
                </p>
              </div>
            ) : (
              <form onSubmit={registrar} className="mt-7 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Nombre de usuario
                    <span className="relative mt-2 block">
                      <UserRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input required maxLength={120} autoComplete="username" aria-label="Nombre de usuario para iniciar sesión" placeholder="Elige tu usuario" value={form.nombre} onChange={(e) => setForm((v) => ({ ...v, nombre: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25" />
                    </span>
                    <span className="mt-1.5 block text-[10px] font-normal normal-case tracking-normal text-slate-400">Este será tu usuario para iniciar sesión.</span>
                  </label>

                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Contraseña
                    <span className="relative mt-2 block">
                      <input required minLength={8} maxLength={128} type={mostrarPassword ? "text" : "password"} autoComplete="new-password" placeholder="Crea una contraseña segura" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-3 pr-10 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25" />
                      <button type="button" onClick={() => setMostrarPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#987400]" aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                        {mostrarPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </span>
                    <span className="mt-1.5 block text-[10px] font-normal normal-case tracking-normal text-slate-400">Mínimo 8 caracteres.</span>
                  </label>

                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Nombre del taller
                    <span className="relative mt-2 block">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input required maxLength={160} placeholder="Ej. Taller Lucas" value={form.taller} onChange={(e) => setForm((v) => ({ ...v, taller: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25" />
                    </span>
                  </label>

                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Correo electrónico
                    <span className="relative mt-2 block">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input required type="email" maxLength={160} autoComplete="email" placeholder="tucorreo@ejemplo.com" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25" />
                    </span>
                  </label>

                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:col-span-2">
                    WhatsApp / teléfono
                    <span className="mt-2 flex gap-2">
                      <span className="relative w-[132px] shrink-0">
                        <select aria-label="Código telefónico del país" value={codigoPais} onChange={(e) => setCodigoPais(e.target.value)} className="h-full min-h-[46px] w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-7 text-sm font-semibold text-[#17232d] outline-none transition focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25">
                          <option value="+51">🇵🇪 +51</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+54">🇦🇷 +54</option>
                          <option value="+591">🇧🇴 +591</option>
                          <option value="+55">🇧🇷 +55</option>
                          <option value="+56">🇨🇱 +56</option>
                          <option value="+57">🇨🇴 +57</option>
                          <option value="+506">🇨🇷 +506</option>
                          <option value="+53">🇨🇺 +53</option>
                          <option value="+593">🇪🇨 +593</option>
                          <option value="+503">🇸🇻 +503</option>
                          <option value="+34">🇪🇸 +34</option>
                          <option value="+1">🇨🇦 +1</option>
                          <option value="+502">🇬🇹 +502</option>
                          <option value="+504">🇭🇳 +504</option>
                          <option value="+52">🇲🇽 +52</option>
                          <option value="+505">🇳🇮 +505</option>
                          <option value="+507">🇵🇦 +507</option>
                          <option value="+595">🇵🇾 +595</option>
                          <option value="+1">🇵🇷 +1</option>
                          <option value="+1">🇩🇴 +1</option>
                          <option value="+598">🇺🇾 +598</option>
                          <option value="+58">🇻🇪 +58</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+49">🇩🇪 +49</option>
                          <option value="+39">🇮🇹 +39</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+81">🇯🇵 +81</option>
                        </select>
                      </span>
                      <span className="relative min-w-0 flex-1">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input type="tel" inputMode="numeric" maxLength={20} autoComplete="tel-national" placeholder="Número sin código de país" value={form.telefono} onChange={(e) => setForm((v) => ({ ...v, telefono: e.target.value.replace(/[^0-9\s()-]/g, "") }))} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25" />
                      </span>
                    </span>
                    <span className="mt-1.5 block text-[10px] font-normal normal-case tracking-normal text-slate-400">Selecciona el prefijo internacional de tu país.</span>
                  </label>

                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Ciudad
                    <span className="relative mt-2 block">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input maxLength={80} placeholder="Tu ciudad" value={form.ciudad} onChange={(e) => setForm((v) => ({ ...v, ciudad: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-[#17232d] outline-none transition placeholder:text-slate-400 focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25" />
                    </span>
                  </label>

                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    País
                    <span className="relative mt-2 block">
                      <select required autoComplete="country-name" value={form.pais} onChange={(e) => setForm((v) => ({ ...v, pais: e.target.value }))} className="w-full min-h-[46px] appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#17232d] outline-none transition focus:border-[#c59a18] focus:ring-2 focus:ring-[#f8c928]/25">
                        <option value="Perú">🇵🇪 Perú</option>
                        <option value="Argentina">🇦🇷 Argentina</option>
                        <option value="Bolivia">🇧🇴 Bolivia</option>
                        <option value="Brasil">🇧🇷 Brasil</option>
                        <option value="Canadá">🇨🇦 Canadá</option>
                        <option value="Chile">🇨🇱 Chile</option>
                        <option value="Colombia">🇨🇴 Colombia</option>
                        <option value="Costa Rica">🇨🇷 Costa Rica</option>
                        <option value="Cuba">🇨🇺 Cuba</option>
                        <option value="Ecuador">🇪🇨 Ecuador</option>
                        <option value="El Salvador">🇸🇻 El Salvador</option>
                        <option value="España">🇪🇸 España</option>
                        <option value="Estados Unidos">🇺🇸 Estados Unidos</option>
                        <option value="Guatemala">🇬🇹 Guatemala</option>
                        <option value="Honduras">🇭🇳 Honduras</option>
                        <option value="México">🇲🇽 México</option>
                        <option value="Nicaragua">🇳🇮 Nicaragua</option>
                        <option value="Panamá">🇵🇦 Panamá</option>
                        <option value="Paraguay">🇵🇾 Paraguay</option>
                        <option value="Puerto Rico">🇵🇷 Puerto Rico</option>
                        <option value="República Dominicana">🇩🇴 República Dominicana</option>
                        <option value="Uruguay">🇺🇾 Uruguay</option>
                        <option value="Venezuela">🇻🇪 Venezuela</option>
                        <option value="Alemania">🇩🇪 Alemania</option>
                        <option value="Francia">🇫🇷 Francia</option>
                        <option value="Italia">🇮🇹 Italia</option>
                        <option value="Reino Unido">🇬🇧 Reino Unido</option>
                        <option value="Japón">🇯🇵 Japón</option>
                        <option value="Otro">Otro país</option>
                      </select>
                    </span>
                  </label>
                </div>

                <div className="rounded-2xl border border-[#eadca8] bg-[#fffaf0] p-4 text-sm leading-relaxed text-slate-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-[#987400]">Plan Emprendedor</p>
                    <span className="rounded-full border border-[#d9bd68] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#987400]">Gratis</span>
                  </div>
                  <p className="mt-2">Empieza gratis con las herramientas públicas y organiza clientes, cotizaciones y pedidos desde tu taller.</p>
                  <p className="mt-2 text-xs text-slate-500">Al registrarte crearás tu taller y tu cuenta de <span className="font-semibold text-[#987400]">gerente</span>. No se activa ningún pago.</p>
                </div>

                {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={cerrar} className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={cargando} className="rounded-xl bg-[#f8c928] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#17232d] shadow-sm transition hover:bg-[#ffdf65] disabled:opacity-50">
                    {cargando ? "Creando taller…" : "Crear mi taller"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
