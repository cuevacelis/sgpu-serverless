export interface ISpPresupuestoObtenPaginado {
  result: {
    data: Array<{
      pre_id: number;
      pre_codigo?: string;
      usu_nomapellidos: string;
      pre_nombre: string;
      cli_nomaperazsocial: string;
      pai_nombre: string;
      dep_nombre: string;
      prov_nombre: string;
      dist_nombre: string;
      pre_jornal: number;
      pre_fechorregistro: string;
      pre_estado: number;
    }>;
    meta: {
      total_pagina: number;
      total_registro: number;
      tiene_pagina_anterior: boolean;
      tiene_pagina_proximo: boolean;
    };
  };
}
