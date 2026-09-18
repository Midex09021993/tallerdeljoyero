/**
 * AURUM RENDER CATALOG
 * Catálogo técnico separado de la experiencia del visor.
 * La UI consume estos perfiles; la configuración podrá migrarse después
 * a Gestión → Configuración de Calculadoras / Render sin tocar el visor.
 */

export type MaterialId =
  | "oro18a_pulido" | "oro18a_satinado" | "oro18a_mate" | "oro18a_cepillado"
  | "oro18b_rodinado" | "oro18b_pulido" | "oro18b_mate"
  | "oro18r_pulido" | "oro18r_satinado" | "oro18r_mate"
  | "plata925_pulida" | "plata950_pulida" | "plata970_pulida" | "plata_envejecida"
  | "platino_pulido" | "platino_mate"
  | "oro24_pulido" | "oro18_champan" | "oro18_verde"
  | "oro18a_artesanal_pulido" | "oro18a_calido" | "oro18_naranja" | "oro18_rojo" | "oro18_martillado"
  | "paladio_pulido" | "rodio_negro" | "titanio_pulido";
export type EscenarioId = "oscuro" | "claro" | "luxury" | "marmol" | "transparente" | "producto" | "galeria" | "oroCalido" | "gemaClara";
export type VistaId = "perspectiva" | "frontal" | "superior" | "lateral";
export type IluminacionId = "studioSoft" | "studioHard" | "jewelry" | "luxury";

export type MaterialGrupo = "Oro Amarillo" | "Oro Blanco" | "Oro Rosa" | "Plata" | "Platino" | "Especiales";
export type CategoriaParte = "metal" | "gema" | "otro";
export type GemaId =
  | "diamante_natural" | "diamante_vs" | "diamante_inclusiones"
  | "zafiro_azul" | "zafiro_intenso" | "zafiro_inclusiones"
  | "rubi_natural" | "rubi_sangre_pichon" | "rubi_inclusiones"
  | "esmeralda_1" | "esmeralda_2" | "esmeralda_3" | "esmeralda_inclusiones"
  | "moissanita_blanca" | "moissanita_brillante"
  | "citrino_natural" | "citrino_intenso"
  | "amatista_natural" | "amatista_intensa"
  | "topacio_azul" | "topacio_imperial"
  | "turmalina_paraiba" | "turmalina_rubelite" | "turmalina_bicolor"
  | "aguamarina_brasil" | "alexandrita_brasil" | "topacio_imperial_minas"
  | "cuarzo_rutilado_bahia" | "ametrino_bolivia"
  | "opal_peru_rosa" | "opal_peru_azul" | "crisocola_gem_silica_peru"
  | "rodocrosita_argentina";
export type GemaOrigen = "Colombia" | "Brasil" | "Bolivia" | "Perú" | "Argentina" | "Latinoamérica" | "Global";
export type GemaPerfilInterno = "colombia_jardin" | "brasil_jardin" | "paraiba_acicular" | "paraiba_chatoyancy" | "brasil_pegmatita" | "ametrino_zonificado" | "cuarzo_rutilado" | "opal_microestructura" | "crisocola_calcedonia" | "rodocrosita_crecimiento" | "generico";
export type GemaConfig = {
  id:GemaId; familia:string; nombre:string; color:number; transmission:number; ior:number; roughness:number; envMapIntensity:number;
  attenuationColor:number; attenuationDistance:number; dispersion:number; iridescence:number;
  inclusionStyle:"ninguna"|"diamante"|"silk"|"velos"; inclusionStrength:number;
  origen?:GemaOrigen; perfilInterno?:GemaPerfilInterno; notaGemologica?:string;
};
export type MaterialConfig = { id: MaterialId; grupo: MaterialGrupo; nombre: string; color: number; metalness: number; roughness: number; envMapIntensity: number; clearcoat: number; anisotropy?: number; anisotropyRotation?: number };
export type ParteModelo = { id: string; nombre: string; tipo: "grupo" | "malla"; nivel: number; capa?: string; colorCapa?: string; categoria: CategoriaParte };
export const GEMAS: GemaConfig[] = [
  // Perfil óptico propio de AURUM RENDER. El diamante real tiene RI ~2.42 y
  // dispersión ~0.044; MeshPhysicalMaterial limita IOR a 2.333, por lo que
  // usamos el máximo soportado y una dispersión contenida para evitar arcoíris artificiales.
  { id:"diamante_natural", familia:"Diamante", nombre:"Diamante Natural", color:0xfafcff, transmission:.985, ior:2.333, roughness:.009, envMapIntensity:2.05, attenuationColor:0xf9fcff, attenuationDistance:22, dispersion:.22, iridescence:.008, inclusionStyle:"diamante", inclusionStrength:.08 },
  { id:"diamante_vs", familia:"Diamante", nombre:"Diamante VS", color:0xfcfdff, transmission:.99, ior:2.333, roughness:.006, envMapIntensity:2.18, attenuationColor:0xfbfdff, attenuationDistance:32, dispersion:.24, iridescence:.006, inclusionStyle:"diamante", inclusionStrength:.035 },
  { id:"diamante_inclusiones", familia:"Diamante", nombre:"Diamante · Inclusiones", color:0xf5f9ff, transmission:.975, ior:2.333, roughness:.014, envMapIntensity:1.92, attenuationColor:0xf2f7ff, attenuationDistance:13, dispersion:.20, iridescence:.01, inclusionStyle:"diamante", inclusionStrength:.22 },
  { id:"zafiro_azul", familia:"Zafiro", nombre:"Zafiro Azul Natural", color:0x174a9e, transmission:.9, ior:1.77, roughness:.025, envMapIntensity:4.1, attenuationColor:0x123d91, attenuationDistance:2.4, dispersion:.12, iridescence:.015, inclusionStyle:"silk", inclusionStrength:.08 },
  { id:"zafiro_intenso", familia:"Zafiro", nombre:"Zafiro Azul Intenso", color:0x0d2f78, transmission:.86, ior:1.77, roughness:.03, envMapIntensity:4.3, attenuationColor:0x08265f, attenuationDistance:1.55, dispersion:.1, iridescence:.01, inclusionStyle:"silk", inclusionStrength:.05 },
  { id:"zafiro_inclusiones", familia:"Zafiro", nombre:"Zafiro · Inclusiones", color:0x194a96, transmission:.88, ior:1.77, roughness:.035, envMapIntensity:3.9, attenuationColor:0x123a82, attenuationDistance:2, dispersion:.1, iridescence:.015, inclusionStyle:"silk", inclusionStrength:.24 },
  { id:"rubi_natural", familia:"Rubí", nombre:"Rubí Natural", color:0x9e1020, transmission:.88, ior:1.77, roughness:.028, envMapIntensity:4.1, attenuationColor:0x65070f, attenuationDistance:2.2, dispersion:.11, iridescence:.012, inclusionStyle:"silk", inclusionStrength:.1 },
  { id:"rubi_sangre_pichon", familia:"Rubí", nombre:"Rubí · Sangre de Pichón", color:0x8f0b18, transmission:.9, ior:1.77, roughness:.022, envMapIntensity:4.5, attenuationColor:0x57040b, attenuationDistance:2.7, dispersion:.12, iridescence:.01, inclusionStyle:"silk", inclusionStrength:.06 },
  { id:"rubi_inclusiones", familia:"Rubí", nombre:"Rubí · Inclusiones", color:0x86101b, transmission:.86, ior:1.77, roughness:.038, envMapIntensity:3.8, attenuationColor:0x4f050c, attenuationDistance:1.8, dispersion:.1, iridescence:.012, inclusionStyle:"silk", inclusionStrength:.26 },
  { id:"esmeralda_1", familia:"Esmeralda", nombre:"Esmeralda · Calidad 1", color:0x087c4a, transmission:.83, ior:1.58, roughness:.032, envMapIntensity:4.2, attenuationColor:0x075a36, attenuationDistance:1.8, dispersion:.08, iridescence:.008, inclusionStyle:"velos", inclusionStrength:.08, origen:"Latinoamérica", perfilInterno:"colombia_jardin" },
  { id:"esmeralda_2", familia:"Esmeralda", nombre:"Esmeralda · Calidad 2", color:0x087047, transmission:.78, ior:1.58, roughness:.045, envMapIntensity:3.9, attenuationColor:0x064b31, attenuationDistance:1.35, dispersion:.07, iridescence:.006, inclusionStyle:"velos", inclusionStrength:.16, origen:"Latinoamérica", perfilInterno:"colombia_jardin" },
  { id:"esmeralda_3", familia:"Esmeralda", nombre:"Esmeralda · Calidad 3", color:0x075b3d, transmission:.72, ior:1.58, roughness:.06, envMapIntensity:3.6, attenuationColor:0x043c29, attenuationDistance:1, dispersion:.06, iridescence:.005, inclusionStyle:"velos", inclusionStrength:.24, origen:"Latinoamérica", perfilInterno:"colombia_jardin" },
  { id:"esmeralda_inclusiones", familia:"Esmeralda", nombre:"Esmeralda · Inclusiones", color:0x075f3e, transmission:.75, ior:1.58, roughness:.052, envMapIntensity:3.7, attenuationColor:0x043e29, attenuationDistance:1.1, dispersion:.065, iridescence:.006, inclusionStyle:"velos", inclusionStrength:.34, origen:"Colombia", perfilInterno:"colombia_jardin", notaGemologica:"Perfil de estudio inspirado en jardin, velos e inclusiones multifásicas de esmeraldas colombianas." },
  { id:"moissanita_blanca", familia:"Moissanita", nombre:"Moissanita Blanca", color:0xf4f8ff, transmission:.96, ior:2.65, roughness:.016, envMapIntensity:5.1, attenuationColor:0xf6faff, attenuationDistance:10, dispersion:.9, iridescence:.06, inclusionStyle:"diamante", inclusionStrength:.04 },
  { id:"moissanita_brillante", familia:"Moissanita", nombre:"Moissanita · Brillante", color:0xeaf3ff, transmission:.955, ior:2.65, roughness:.012, envMapIntensity:5.5, attenuationColor:0xf2f8ff, attenuationDistance:12, dispersion:1, iridescence:.08, inclusionStyle:"diamante", inclusionStrength:.02 },
  { id:"citrino_natural", familia:"Citrino", nombre:"Citrino Natural", color:0xd49a22, transmission:.86, ior:1.54, roughness:.035, envMapIntensity:3.7, attenuationColor:0xa96d0c, attenuationDistance:2.5, dispersion:.045, iridescence:.005, inclusionStyle:"velos", inclusionStrength:.08 },
  { id:"citrino_intenso", familia:"Citrino", nombre:"Citrino Intenso", color:0xb8780b, transmission:.8, ior:1.54, roughness:.045, envMapIntensity:3.6, attenuationColor:0x8b5307, attenuationDistance:1.7, dispersion:.04, iridescence:.004, inclusionStyle:"velos", inclusionStrength:.14 },
  { id:"amatista_natural", familia:"Amatista", nombre:"Amatista Natural", color:0x7650b9, transmission:.86, ior:1.55, roughness:.035, envMapIntensity:3.8, attenuationColor:0x57358f, attenuationDistance:2.3, dispersion:.045, iridescence:.005, inclusionStyle:"velos", inclusionStrength:.08 },
  { id:"amatista_intensa", familia:"Amatista", nombre:"Amatista Intensa", color:0x5b319c, transmission:.8, ior:1.55, roughness:.045, envMapIntensity:3.6, attenuationColor:0x3f2076, attenuationDistance:1.7, dispersion:.04, iridescence:.004, inclusionStyle:"velos", inclusionStrength:.13 },
  { id:"topacio_azul", familia:"Topacio", nombre:"Topacio Azul", color:0x65b9e8, transmission:.92, ior:1.63, roughness:.025, envMapIntensity:4.2, attenuationColor:0x4d9acb, attenuationDistance:3.5, dispersion:.055, iridescence:.008, inclusionStyle:"velos", inclusionStrength:.05 },
  { id:"topacio_imperial", familia:"Topacio", nombre:"Topacio Imperial", color:0xd79b4b, transmission:.88, ior:1.63, roughness:.032, envMapIntensity:4, attenuationColor:0xa96722, attenuationDistance:2.5, dispersion:.05, iridescence:.006, inclusionStyle:"velos", inclusionStrength:.08, origen:"Brasil", perfilInterno:"brasil_pegmatita" },

  // ── Biblioteca latinoamericana AURUM ─────────────────────────────────────
  // Brasil: turmalinas, berilos, topacio imperial, cuarzos y crisoberilo.
  { id:"turmalina_paraiba", familia:"Turmalina", nombre:"Turmalina Paraíba · Brasil", color:0x19d6d0, transmission:.91, ior:1.64, roughness:.022, envMapIntensity:4.4, attenuationColor:0x0b9f9d, attenuationDistance:3.1, dispersion:.017, iridescence:.018, inclusionStyle:"silk", inclusionStrength:.12, origen:"Brasil", perfilInterno:"paraiba_acicular", notaGemologica:"Perfil visual inspirado en turmalina cobreífera de Paraíba: color neón y rasgos aciculares." },
  { id:"turmalina_rubelite", familia:"Turmalina", nombre:"Rubelita · Brasil", color:0xb51f63, transmission:.86, ior:1.64, roughness:.03, envMapIntensity:3.8, attenuationColor:0x72123f, attenuationDistance:2.3, dispersion:.018, iridescence:.01, inclusionStyle:"silk", inclusionStrength:.15, origen:"Brasil", perfilInterno:"brasil_pegmatita" },
  { id:"turmalina_bicolor", familia:"Turmalina", nombre:"Turmalina Bicolor · Brasil", color:0x3aa96b, transmission:.9, ior:1.64, roughness:.025, envMapIntensity:4.0, attenuationColor:0x28774e, attenuationDistance:3.0, dispersion:.018, iridescence:.012, inclusionStyle:"silk", inclusionStrength:.1, origen:"Brasil", perfilInterno:"brasil_pegmatita" },
  { id:"aguamarina_brasil", familia:"Aguamarina", nombre:"Aguamarina · Brasil", color:0x72c9df, transmission:.93, ior:1.577, roughness:.02, envMapIntensity:4.0, attenuationColor:0x4b9fb9, attenuationDistance:4.5, dispersion:.014, iridescence:.012, inclusionStyle:"velos", inclusionStrength:.08, origen:"Brasil", perfilInterno:"brasil_pegmatita", notaGemologica:"Perfil visual inspirado en aguamarina de pegmatita brasileña." },
  { id:"alexandrita_brasil", familia:"Crisoberilo", nombre:"Alejandrita · Brasil", color:0x4e8c62, transmission:.88, ior:1.746, roughness:.018, envMapIntensity:3.7, attenuationColor:0x74384a, attenuationDistance:3.0, dispersion:.015, iridescence:.015, inclusionStyle:"ninguna", inclusionStrength:.02, origen:"Brasil", perfilInterno:"brasil_pegmatita", notaGemologica:"Perfil de cambio de color dependiente de iluminante; no pretende certificar origen." },
  { id:"topacio_imperial_minas", familia:"Topacio", nombre:"Topacio Imperial · Minas Gerais", color:0xd88943, transmission:.89, ior:1.63, roughness:.028, envMapIntensity:4.1, attenuationColor:0xa95f25, attenuationDistance:3.0, dispersion:.055, iridescence:.008, inclusionStyle:"velos", inclusionStrength:.12, origen:"Brasil", perfilInterno:"brasil_pegmatita", notaGemologica:"Variedad naranja a naranja rojiza asociada a Ouro Preto, Minas Gerais." },
  { id:"cuarzo_rutilado_bahia", familia:"Cuarzo", nombre:"Cuarzo Rutilado · Bahía", color:0xe8dfc9, transmission:.92, ior:1.544, roughness:.025, envMapIntensity:3.7, attenuationColor:0xd9c99f, attenuationDistance:5.0, dispersion:.014, iridescence:.01, inclusionStyle:"silk", inclusionStrength:.18, origen:"Brasil", perfilInterno:"cuarzo_rutilado", notaGemologica:"Red interna de agujas de rutilo dorado; la orientación debe conservarse para el efecto visual." },

  // Bolivia: Ametrino de Anahí, con zonificación amatista/citrino.
  { id:"ametrino_bolivia", familia:"Ametrino", nombre:"Ametrino · Anahí Bolivia", color:0xa46c91, transmission:.91, ior:1.544, roughness:.022, envMapIntensity:4.0, attenuationColor:0x9a633f, attenuationDistance:4.0, dispersion:.013, iridescence:.008, inclusionStyle:"velos", inclusionStrength:.08, origen:"Bolivia", perfilInterno:"ametrino_zonificado", notaGemologica:"Perfil bicolor amatista/citrino inspirado en material comercial de la mina Anahí." },

  // Perú: materiales lapidarios y gemas de interés regional documentados por GIA.
  { id:"opal_peru_rosa", familia:"Ópalo", nombre:"Ópalo Rosa · Perú", color:0xe3a8a2, transmission:.58, ior:1.45, roughness:.28, envMapIntensity:2.2, attenuationColor:0xb86f73, attenuationDistance:1.7, dispersion:.01, iridescence:.0, inclusionStyle:"velos", inclusionStrength:.18, origen:"Perú", perfilInterno:"opal_microestructura", notaGemologica:"Ópalo común rosa; no se simula play-of-color como si fuera ópalo precioso." },
  { id:"opal_peru_azul", familia:"Ópalo", nombre:"Ópalo Azul · Perú", color:0x6faeb8, transmission:.62, ior:1.45, roughness:.25, envMapIntensity:2.4, attenuationColor:0x4c7f8c, attenuationDistance:1.9, dispersion:.01, iridescence:.0, inclusionStyle:"velos", inclusionStrength:.16, origen:"Perú", perfilInterno:"opal_microestructura", notaGemologica:"Ópalo común azul; el render evita inventar juego de color propio del ópalo precioso." },
  { id:"crisocola_gem_silica_peru", familia:"Crisocola", nombre:"Gem Silica · Crisocola · Perú", color:0x28a9a4, transmission:.52, ior:1.54, roughness:.16, envMapIntensity:3.0, attenuationColor:0x157c7b, attenuationDistance:1.4, dispersion:.012, iridescence:.004, inclusionStyle:"velos", inclusionStrength:.22, origen:"Perú", perfilInterno:"crisocola_calcedonia", notaGemologica:"Perfil para sílice/calcedonia teñida por crisocola, no para una crisocola opaca genérica." },

  // Argentina: rodocrosita de Capillitas y estructuras de crecimiento.
  { id:"rodocrosita_argentina", familia:"Rodocrosita", nombre:"Rodocrosita · Capillitas Argentina", color:0xc65d73, transmission:.28, ior:1.60, roughness:.34, envMapIntensity:2.1, attenuationColor:0x843a50, attenuationDistance:.75, dispersion:.02, iridescence:.003, inclusionStyle:"velos", inclusionStrength:.25, origen:"Argentina", perfilInterno:"rodocrosita_crecimiento", notaGemologica:"Perfil pensado para crecimiento y zonificación, no como vidrio rosado homogéneo." },
];

export const MATERIALES: MaterialConfig[] = [
  { id: "oro18a_pulido", grupo: "Oro Amarillo", nombre: "Pulido", color: 0xd8ad4c, metalness: 1, roughness: .10, envMapIntensity: 1.82, clearcoat: .18, anisotropy: .04 },
  { id: "oro18a_satinado", grupo: "Oro Amarillo", nombre: "Satinado", color: 0xd2aa55, metalness: 1, roughness: .28, envMapIntensity: 1.65, clearcoat: .20, anisotropy: .2 },
  { id: "oro18a_mate", grupo: "Oro Amarillo", nombre: "Mate", color: 0xc7a45a, metalness: 1, roughness: .52, envMapIntensity: 1.35, clearcoat: .06, anisotropy: .35 },
  { id: "oro18a_cepillado", grupo: "Oro Amarillo", nombre: "Cepillado", color: 0xcfa94e, metalness: 1, roughness: .38, envMapIntensity: 1.55, clearcoat: .10, anisotropy: .72, anisotropyRotation: .18 },
  { id: "oro18b_rodinado", grupo: "Oro Blanco", nombre: "Rodinado", color: 0xe7ebee, metalness: 1, roughness: .075, envMapIntensity: 1.92, clearcoat: .18, anisotropy: .04 },
  { id: "oro18b_pulido", grupo: "Oro Blanco", nombre: "Pulido", color: 0xdce1e5, metalness: 1, roughness: .11, envMapIntensity: 1.80, clearcoat: .15, anisotropy: .05 },
  { id: "oro18b_mate", grupo: "Oro Blanco", nombre: "Mate", color: 0xcbd0d5, metalness: 1, roughness: .5, envMapIntensity: 1.75, clearcoat: .08 },
  { id: "oro18r_pulido", grupo: "Oro Rosa", nombre: "Pulido", color: 0xd68f79, metalness: 1, roughness: .11, envMapIntensity: 1.84, clearcoat: .16, anisotropy: .05 },
  { id: "oro18r_satinado", grupo: "Oro Rosa", nombre: "Satinado", color: 0xd18b76, metalness: 1, roughness: .27, envMapIntensity: 1.56, clearcoat: .10, anisotropy: .18 },
  { id: "oro18r_mate", grupo: "Oro Rosa", nombre: "Mate", color: 0xc98573, metalness: 1, roughness: .5, envMapIntensity: 1.35, clearcoat: .06 },
  { id: "plata925_pulida", grupo: "Plata", nombre: "Plata 925 Pulida", color: 0xe1e4e7, metalness: 1, roughness: .14, envMapIntensity: 1.55, clearcoat: .08 },
  { id: "plata950_pulida", grupo: "Plata", nombre: "Plata 950 Pulida", color: 0xdfe3e7, metalness: 1, roughness: .15, envMapIntensity: 1.5, clearcoat: .08 },
  { id: "plata970_pulida", grupo: "Plata", nombre: "Plata 970 Pulida", color: 0xe8eaec, metalness: 1, roughness: .13, envMapIntensity: 1.6, clearcoat: .08 },
  { id: "plata_envejecida", grupo: "Plata", nombre: "Plata Envejecida", color: 0x777c82, metalness: .92, roughness: .4, envMapIntensity: 1.65, clearcoat: .08, anisotropy: .08 },
  { id: "platino_pulido", grupo: "Platino", nombre: "Pulido", color: 0xc5cbd0, metalness: 1, roughness: .1, envMapIntensity: 1.95, clearcoat: .42 },
  { id: "platino_mate", grupo: "Platino", nombre: "Mate", color: 0xaeb4ba, metalness: 1, roughness: .48, envMapIntensity: 1.35, clearcoat: .06 },
  // Materiales especiales para presentaciones profesionales y configuraciones premium.
  // Perfiles LATAM: 18K = 750/1000 de oro. Los tonos son perfiles visuales;
  // la documentación técnica define la ley y el efecto del cobre/plata sobre
  // el color, pero no prescribe valores RGB/PBR universales.
  { id: "oro18a_artesanal_pulido", grupo: "Oro Amarillo", nombre: "Oro 18K Amarillo Artesanal", color: 0xd5a84a, metalness: 1, roughness: .19, envMapIntensity: 1.68, clearcoat: .10, anisotropy: .12 },
  { id: "oro18a_calido", grupo: "Oro Amarillo", nombre: "Oro 18K Amarillo Cálido", color: 0xddad45, metalness: 1, roughness: .12, envMapIntensity: 1.84, clearcoat: .14, anisotropy: .05 },
  { id: "oro18_naranja", grupo: "Especiales", nombre: "Oro 18K Naranja", color: 0xd2863f, metalness: 1, roughness: .13, envMapIntensity: 1.82, clearcoat: .14, anisotropy: .05 },
  { id: "oro18_rojo", grupo: "Especiales", nombre: "Oro 18K Rojo", color: 0xc66f58, metalness: 1, roughness: .14, envMapIntensity: 1.78, clearcoat: .13, anisotropy: .06 },
  { id: "oro18_martillado", grupo: "Oro Amarillo", nombre: "Oro 18K Martillado Artesanal", color: 0xc9a04e, metalness: 1, roughness: .27, envMapIntensity: 1.48, clearcoat: .06, anisotropy: .16 },
  { id: "oro24_pulido", grupo: "Especiales", nombre: "Oro 24K Pulido", color: 0xf2c94c, metalness: 1, roughness: .075, envMapIntensity: 3.25, clearcoat: .65 },
  { id: "oro18_champan", grupo: "Especiales", nombre: "Oro Champán", color: 0xd9b978, metalness: 1, roughness: .13, envMapIntensity: 2.8, clearcoat: .5 },
  { id: "oro18_verde", grupo: "Especiales", nombre: "Oro Verde", color: 0xb9bd72, metalness: 1, roughness: .14, envMapIntensity: 2.65, clearcoat: .48 },
  { id: "paladio_pulido", grupo: "Especiales", nombre: "Paladio Pulido", color: 0xd4d8dc, metalness: 1, roughness: .09, envMapIntensity: 3.05, clearcoat: .58 },
  { id: "rodio_negro", grupo: "Especiales", nombre: "Rodio Negro", color: 0x252a30, metalness: 1, roughness: .12, envMapIntensity: 1.8, clearcoat: .45 },
  { id: "titanio_pulido", grupo: "Especiales", nombre: "Titanio Pulido", color: 0x8d959d, metalness: .96, roughness: .16, envMapIntensity: 1.75, clearcoat: .34 },
];

export const ESCENARIOS: { id: EscenarioId; nombre: string; clase: string; descripcion:string; iluminacion:IluminacionId }[] = [
  { id: "oscuro", nombre: "Estudio Oscuro", descripcion:"Contraste elegante", iluminacion:"jewelry", clase: "bg-[radial-gradient(circle_at_50%_35%,#2b2f35_0%,#101216_48%,#050608_100%)]" },
  { id: "claro", nombre: "Estudio Claro", descripcion:"Luz de joyería profesional", iluminacion:"jewelry", clase: "bg-[radial-gradient(circle_at_50%_30%,#ffffff_0%,#e8e6e1_58%,#c8c5bf_100%)]" },
  { id: "luxury", nombre: "Luxury", descripcion:"Presentación cálida", iluminacion:"luxury", clase: "bg-[radial-gradient(circle_at_50%_30%,#6b4a22_0%,#2b1b0d_42%,#100a06_100%)]" },
  { id: "marmol", nombre: "Mármol", descripcion:"Superficie premium", iluminacion:"studioSoft", clase: "bg-[linear-gradient(125deg,#f2f0eb,#bdbab3_42%,#e5e3de_44%,#c5c2bc_68%,#f0eee9)]" },
  { id: "transparente", nombre: "Transparente", descripcion:"Fondo sin entorno", iluminacion:"studioSoft", clase: "bg-[linear-gradient(45deg,#d9d9d9_25%,transparent_25%),linear-gradient(-45deg,#d9d9d9_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d9d9d9_75%),linear-gradient(-45deg,transparent_75%,#d9d9d9_75%)] bg-[length:14px_14px] bg-[position:0_0,0_7px,7px_-7px,-7px_0]" },
  { id: "producto", nombre: "Producto", descripcion:"High-key de estudio", iluminacion:"studioSoft", clase:"bg-[radial-gradient(circle_at_50%_28%,#ffffff_0%,#f4f3f0_58%,#dedbd5_100%)]" },
  { id: "galeria", nombre: "Galería", descripcion:"Contraste controlado", iluminacion:"studioHard", clase:"bg-[radial-gradient(circle_at_50%_30%,#34363b_0%,#18191c_55%,#0d0e10_100%)]" },
  { id: "oroCalido", nombre: "Oro Cálido", descripcion:"Presentación cálida", iluminacion:"luxury", clase:"bg-[radial-gradient(circle_at_50%_30%,#76532a_0%,#302216_48%,#17100a_100%)]" },
  { id: "gemaClara", nombre: "Gema Clara", descripcion:"Realce de piedras", iluminacion:"studioSoft", clase:"bg-[radial-gradient(circle_at_50%_30%,#ffffff_0%,#e7edf2_58%,#cfd9e1_100%)]" },
];
export const VISTAS: { id: VistaId; nombre: string }[] = [
  { id: "perspectiva", nombre: "Perspectiva" }, { id: "frontal", nombre: "Frontal" }, { id: "superior", nombre: "Superior" }, { id: "lateral", nombre: "Lateral" },
];
export const ILUMINACIONES: { id: IluminacionId; nombre: string; descripcion: string }[] = [
  { id: "studioSoft", nombre: "Studio Soft", descripcion: "Suave" },
  { id: "studioHard", nombre: "Studio Hard", descripcion: "Contraste" },
  { id: "jewelry", nombre: "Jewelry", descripcion: "Detalle" },
  { id: "luxury", nombre: "Luxury", descripcion: "Dramática" },
];