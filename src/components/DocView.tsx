/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

export default function DocView() {
  return (
    <div className="space-y-8 animate-fade-in p-2">
      <div className="bg-[#0f0f0f] border border-white/10 p-6 rounded-xl shadow-2xl">
        <h2 className="text-xl font-bold text-white tracking-tight uppercase">
          Guia Rápido de Uso e Fluxo de Dados
        </h2>
        <p className="mt-2 text-xs text-slate-400 leading-relaxed font-mono tracking-wide">
          Esta seção descreve como o sistema funciona por trás das telas: atletas, categorias, chaves e sincronização em tempo real.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-black border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">1. Inscrever Atletas</h3>
          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            Use o painel de gerenciamento para adicionar atletas com categoria, faixa, equipe e informações de peso/kimonos completas.
          </p>
          <ul className="mt-4 space-y-2 text-[11px] text-slate-300">
            <li>• Garanta que o atleta esteja na categoria correta antes de salvar.</li>
            <li>• Atualize equipes ou cadastre novas equipes quando necessário.</li>
            <li>• O sistema usa essas informações para gerar chaves automáticas e balanceadas.</li>
          </ul>
        </div>

        <div className="bg-black border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">2. Inscrever Atletas</h3>
          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            Cada atleta precisa ter informações de categoria completas: faixa, idade, peso, gênero e equipe. O sistema usa esses dados para gerar chaves compatíveis e respeitar regras de seeding.
          </p>
          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            Os atletas também têm status de check-in de peso e kimono. Atletas não aprovados podem ser removidos da chave ou realocados manualmente.</p>
        </div>

        <div className="bg-black border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">3. Gerar Chave</h3>
          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            O motor de chaves seleciona atletas por categoria e monta chaves em potência de 2. Ele também injeta BYEs automáticos para ajustar chaves com 3, 5 ou 6 atletas.</p>
          <p className="mt-3 text-[11px] text-slate-300">A geração de chave considera:</p>
          <ul className="mt-2 space-y-2 text-[11px] text-slate-300">
            <li>• Separação de atletas da mesma equipe na primeira rodada.</li>
            <li>• Preservação de seeded na posição máxima possível.</li>
            <li>• Atualização em tempo real via Socket.IO.</li>
          </ul>
        </div>

        <div className="bg-black border border-white/10 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">4. Auditoria e Sincronização</h3>
          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            Todas as ações relevantes são capturadas no histórico de auditoria, incluindo criação de atleta, equipe e geração de chave.</p>
          <p className="mt-3 text-[11px] text-slate-300">O app sincroniza em tempo real com o backend quando o socket detecta atualizações de atletas e equipes.</p>
        </div>
      </div>

      <div className="bg-[#0f0f0f] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Como funciona o fluxo do aplicativo</h3>
        <ol className="list-decimal ml-5 space-y-3 text-[11px] text-slate-300">
          <li>Adicione atletas ao sistema com todas as informações de categoria e equipe.</li>
          <li>Gere chaves por categoria usando o botão de geração automática.</li>
          <li>Use o painel de auditoria para validar mudanças e acompanhar o histórico.</li>
          <li>Troque posições manualmente ou reporte resultados via placar quando as lutas terminarem.</li>
          <li>Mantenha equipes e atletas atualizados para preservar a integridade da chave.</li>
        </ol>
      </div>
    </div>
  );
}
