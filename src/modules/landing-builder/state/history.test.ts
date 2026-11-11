import { describe, expect, it } from 'vitest'
import { canRedo, canUndo, COALESCE_MS, createHistory, HISTORY_LIMIT, pushHistory, redo, undo } from './history'

describe('histórico de desfazer/refazer', () => {
  it('começa sem nada para desfazer ou refazer', () => {
    const history = createHistory('a')
    expect(history.present).toBe('a')
    expect(canUndo(history)).toBe(false)
    expect(canRedo(history)).toBe(false)
    expect(undo(history)).toBe(history)
    expect(redo(history)).toBe(history)
  })

  it('desfaz e refaz na ordem', () => {
    let history = createHistory('a')
    history = pushHistory(history, 'b', 1000)
    history = pushHistory(history, 'c', 5000)
    expect(history.present).toBe('c')

    history = undo(history)
    expect(history.present).toBe('b')
    history = undo(history)
    expect(history.present).toBe('a')
    expect(canUndo(history)).toBe(false)

    history = redo(history)
    expect(history.present).toBe('b')
    history = redo(history)
    expect(history.present).toBe('c')
    expect(canRedo(history)).toBe(false)
  })

  it('uma alteração nova depois de desfazer descarta o refazer', () => {
    let history = createHistory('a')
    history = pushHistory(history, 'b', 1000)
    history = undo(history)
    history = pushHistory(history, 'x', 9000)
    expect(canRedo(history)).toBe(false)
    expect(undo(history).present).toBe('a')
  })

  it('o mesmo estado não cria um passo', () => {
    const history = pushHistory(createHistory('a'), 'b', 1000)
    expect(pushHistory(history, 'b', 2000)).toBe(history)
  })

  it('digitação contínua no mesmo campo vira um passo só', () => {
    let history = createHistory('')
    history = pushHistory(history, 'O', 1000, 'props:t1')
    history = pushHistory(history, 'Of', 1200, 'props:t1')
    history = pushHistory(history, 'Ofe', 1400, 'props:t1')
    expect(history.past).toEqual([''])
    expect(undo(history).present).toBe('')
  })

  it('pausa longa, outro campo ou ação sem chave começam um passo novo', () => {
    let history = createHistory('')
    history = pushHistory(history, 'a', 1000, 'props:t1')
    history = pushHistory(history, 'ab', 1000 + COALESCE_MS, 'props:t1') // pausa
    history = pushHistory(history, 'abc', 1000 + COALESCE_MS + 10, 'props:t2') // outro campo
    history = pushHistory(history, 'abcd', 1000 + COALESCE_MS + 20) // sem chave (mover, excluir…)
    history = pushHistory(history, 'abcde', 1000 + COALESCE_MS + 30) // sem chave nunca agrupa
    expect(history.past).toEqual(['', 'a', 'ab', 'abc', 'abcd'])
  })

  it('depois de desfazer, continuar digitando no mesmo campo é um passo novo', () => {
    let history = createHistory('')
    history = pushHistory(history, 'a', 1000, 'k')
    history = pushHistory(history, 'b', 5000)
    history = undo(history)
    history = pushHistory(history, 'ax', 5100, 'k')
    expect(undo(history).present).toBe('a')
  })

  it('agrupar digitação também descarta o refazer', () => {
    let history = createHistory('')
    history = pushHistory(history, 'a', 1000, 'k')
    history = pushHistory(history, 'ab', 1100, 'k')
    expect(canRedo(history)).toBe(false)
  })

  it('guarda no máximo HISTORY_LIMIT passos (os mais antigos saem)', () => {
    let history = createHistory(0)
    for (let i = 1; i <= HISTORY_LIMIT + 25; i++) history = pushHistory(history, i, i * 5000)
    expect(history.past).toHaveLength(HISTORY_LIMIT)
    expect(history.past[0]).toBe(25)
    expect(history.present).toBe(HISTORY_LIMIT + 25)
  })

  it('não altera o histórico recebido', () => {
    const history = pushHistory(createHistory('a'), 'b', 1000)
    const frozen = JSON.stringify(history)
    undo(history)
    redo(undo(history))
    pushHistory(history, 'c', 9000)
    expect(JSON.stringify(history)).toBe(frozen)
  })
})
