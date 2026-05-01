# AquaSmart - PRD

## Produto
App mobile (Expo React Native) de lembretes inteligentes de hidratação em pt-BR.

## Meta diária inteligente
- Fórmula: peso(kg) × 35ml × multiplicador de atividade (1.0 sedentário / 1.15 moderado / 1.3 ativo), com ajuste por idade (>65: -15%, 56-65: -8%, <18: +5%).
- Arredondada para o múltiplo de 50ml mais próximo.

## Notificações inteligentes
- Agendadas com `expo-notifications` (canal Android `water-reminders`, importância alta).
- Quantidade = `ceil(meta / tamanho_do_copo)`, espaçadas entre horário de acordar +30min e dormir -30min.
- NÃO dispara entre `sleepHour/Minute` e `wakeHour/Minute` (janela de sono customizada pelo usuário).
- Banner "Modo descanso ativo" na tela inicial durante o sono.

## Telas
1. **Onboarding** (4 passos) — nome, peso/idade, nível de atividade, horários de sono (com preview da meta).
2. **Início** — saudação, card de progresso com animação de onda (Reanimated), 4 botões de adição rápida (200/300/500/personalizado), lista de registros do dia com remoção.
3. **Histórico** — stats (média, dias na meta, total), gráfico de barras dos últimos 7 dias com linha da meta.
4. **Conquistas** — streak atual/recorde, stats, 8 medalhas (Primeiro Gole, Meio Caminho, Meta Cumprida, Trinca Hidratada, Semana Perfeita, Mês de Ouro, 10 Litros, Centenário).
5. **Ajustes** — editar peso/idade/atividade/copo, toggle de notificações, pickers de acordar/dormir, resetar dados.

## Persistência
- 100% local via `@react-native-async-storage/async-storage`. Chaves: profile, logs, achievements, streak.
- Sem backend, sem conta, sem integrações externas.

## Design
- Paleta: #0077B6 primário, #00B4D8 onda, #FB8500 accent/conquistas, fundo #F7F9FC.
- Cards arredondados, sombras suaves, tipografia tight.

## Business enhancement (futuro)
Compartilhamento de streak e medalhas via Share API nativa para viralizar o app.
