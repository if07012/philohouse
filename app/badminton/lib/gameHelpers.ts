import {
  ensureSheetWithHeaders,
  listRowsBySheet,
  createRowWithId,
  updateRowById,
} from '@/app/lib/googleSheets';
import {
  GAMES_SHEET,
  GAME_PLAYERS_SHEET,
  GAME_SETTLEMENT_SHEET,
  MEMBER_BILLS_SHEET,
  ensureBadmintonSheetsOnce,
  getConfiguration,
  listMembers,
} from './sheetHelpers';
import {
  getAttendanceChargedMembersByDate,
  isAttendanceChargedForMember,
  markAttendanceCharged,
} from './billHelpers';
import { getBadmintonSpreadsheetId } from './badmintonEnv';
import { getCalendarDateInJakarta } from './dateUtils';
import type {
  Game,
  GameStatus,
  GamePlayerInfo,
  GameSettlement,
  GameWithDetails,
  GameBillPreview,
  SystemConfiguration,
  BatchGenerateBillsResult,
  MemberBillWithDetails,
} from './types';
import { listBillsWithDetails } from './billHelpers';

const GAME_HEADERS = ['id', 'gameDate', 'location', 'status', 'createdDate'] as const;
const GAME_PLAYER_HEADERS = ['id', 'gameId', 'memberId'] as const;
const GAME_SETTLEMENT_HEADERS = [
  'id',
  'gameId',
  'shuttlecockUsed',
  'shuttlecockPrice',
  'attendanceFee',
  'totalBillAmount',
  'createdDate',
] as const;
const MEMBER_BILL_HEADERS = [
  'id',
  'gameId',
  'memberId',
  'billAmount',
  'attendanceFeeAmount',
  'shuttlecockFeeAmount',
  'paidAmount',
  'outstandingAmount',
  'paymentStatus',
  'createdDate',
] as const;

function parseNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseGameStatus(value: unknown): GameStatus {
  const s = String(value || 'ACTIVE').toUpperCase();
  return s === 'FINISHED' ? 'FINISHED' : 'ACTIVE';
}

export function parseGameRow(row: Record<string, unknown>): Game {
  return {
    id: String(row.id || ''),
    gameDate: String(row.gameDate || ''),
    location: row.location ? String(row.location) : undefined,
    status: parseGameStatus(row.status),
    createdDate: String(row.createdDate || ''),
  };
}

export function parseGameSettlementRow(row: Record<string, unknown>): GameSettlement {
  const shuttlecockUsed = parseNumber(row.shuttlecockUsed);
  const shuttlecockPrice = parseNumber(row.shuttlecockPrice);
  const attendanceFee = parseNumber(row.attendanceFee);
  const totalBillAmount = parseNumber(row.totalBillAmount);
  const totalShuttlecockCost = shuttlecockUsed * shuttlecockPrice;
  const shuttlecockPerPerson =
    shuttlecockUsed > 0 ? Math.round(totalShuttlecockCost / 4) : 0;

  return {
    id: String(row.id || ''),
    gameId: String(row.gameId || ''),
    shuttlecockUsed,
    shuttlecockPrice,
    attendanceFee,
    totalBillAmount,
    shuttlecockPerPerson,
    createdDate: String(row.createdDate || ''),
  };
}

export function calculateBillPreview(
  config: SystemConfiguration,
  shuttlecockUsed: number,
  players: { memberId: string; memberName: string }[],
  gameCalendarDate: string,
  attendanceChargedMap: Map<string, Set<string>>
): GameBillPreview {
  const totalShuttlecockCost = shuttlecockUsed * config.defaultShuttlecockPrice;
  const shuttlecockPerPerson = Math.round(totalShuttlecockCost / 4);

  const playerBills = players.map((p) => {
    const attendanceFeeAmount = isAttendanceChargedForMember(
      attendanceChargedMap,
      gameCalendarDate,
      p.memberId
    )
      ? 0
      : config.attendanceFee;
    const shuttlecockFeeAmount = shuttlecockPerPerson;
    return {
      memberId: p.memberId,
      memberName: p.memberName,
      attendanceFeeAmount,
      shuttlecockFeeAmount,
      billAmount: attendanceFeeAmount + shuttlecockFeeAmount,
    };
  });

  const maxBill = Math.max(...playerBills.map((p) => p.billAmount), 0);

  return {
    shuttlecockUsed,
    shuttlecockPrice: config.defaultShuttlecockPrice,
    totalShuttlecockCost,
    shuttlecockPerPerson,
    attendanceFee: config.attendanceFee,
    billAmountPerMember: maxBill,
    players: playerBills,
  };
}

export function validatePlayerIds(playerIds: string[]): void {
  if (playerIds.length !== 4) {
    throw new Error('Permainan harus memiliki tepat 4 pemain');
  }
  const unique = new Set(playerIds);
  if (unique.size !== 4) {
    throw new Error('Pemain tidak boleh duplikat dalam satu permainan');
  }
}

async function listGamePlayerRows(gameId?: string): Promise<Record<string, unknown>[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, GAME_PLAYERS_SHEET);
  if (!gameId) return rows;
  return rows.filter((r) => String(r.gameId || '') === gameId);
}

async function getGamePlayerInfos(gameId: string): Promise<GamePlayerInfo[]> {
  const rows = await listGamePlayerRows(gameId);
  const members = await listMembers();
  const memberMap = new Map(members.map((m) => [m.id, m.name]));

  return rows.map((row) => ({
    id: String(row.id || ''),
    gameId: String(row.gameId || ''),
    memberId: String(row.memberId || ''),
    memberName: memberMap.get(String(row.memberId || '')) || 'Unknown',
  }));
}

async function getSettlementByGameId(gameId: string): Promise<GameSettlement | null> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, GAME_SETTLEMENT_SHEET);
  const row = rows.find((r) => String(r.gameId || '') === gameId);
  if (!row) return null;
  return parseGameSettlementRow(row);
}

async function hasBillsForGame(gameId: string): Promise<boolean> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, MEMBER_BILLS_SHEET);
  return rows.some((r) => String(r.gameId || '') === gameId);
}

export async function getGameById(id: string): Promise<GameWithDetails | null> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, GAMES_SHEET);
  const row = rows.find((r) => String(r.id ?? '').trim() === String(id).trim());
  if (!row) return null;

  const game = parseGameRow(row);
  const [players, settlement, billsGenerated] = await Promise.all([
    getGamePlayerInfos(id),
    getSettlementByGameId(id),
    hasBillsForGame(id),
  ]);

  return { ...game, players, settlement: settlement ?? undefined, billsGenerated };
}

export async function listGamesWithDetails(): Promise<GameWithDetails[]> {
  const spreadsheetId = getBadmintonSpreadsheetId();
  const rows = await listRowsBySheet(spreadsheetId, GAMES_SHEET);
  const games = rows.map(parseGameRow).filter((g) => g.id);

  const details = await Promise.all(games.map((g) => getGameById(g.id)));
  return details
    .filter((g): g is GameWithDetails => g !== null)
    .sort((a, b) => b.gameDate.localeCompare(a.gameDate));
}

export async function listGamesReadyForBilling(): Promise<GameWithDetails[]> {
  const games = await listGamesWithDetails();
  return games
    .filter(
      (g) =>
        g.status === 'ACTIVE' &&
        !g.billsGenerated &&
        g.players.length === 4 &&
        g.settlement
    )
    .sort((a, b) => a.gameDate.localeCompare(b.gameDate));
}

export async function createGame(data: {
  gameDate: string;
  location?: string;
  playerIds: string[];
}): Promise<GameWithDetails> {
  validatePlayerIds(data.playerIds);

  await ensureBadmintonSheetsOnce();

  const members = await listMembers();
  const memberMap = new Map(members.map((m) => [m.id, m]));

  for (const memberId of data.playerIds) {
    const member = memberMap.get(String(memberId).trim());
    if (!member) {
      throw new Error('Member tidak ditemukan. Muat ulang halaman dan coba lagi.');
    }
    if (!member.isActive) {
      throw new Error(`Member "${member.name}" tidak aktif`);
    }
  }

  const spreadsheetId = getBadmintonSpreadsheetId();
  const createdDate = new Date().toISOString();

  const { id: gameId } = await createRowWithId(spreadsheetId, GAMES_SHEET, {
    gameDate: data.gameDate,
    location: data.location?.trim() || '',
    status: 'ACTIVE',
    createdDate,
  });

  await ensureSheetWithHeaders(spreadsheetId, GAME_PLAYERS_SHEET, [...GAME_PLAYER_HEADERS]);

  for (const memberId of data.playerIds) {
    await createRowWithId(spreadsheetId, GAME_PLAYERS_SHEET, {
      gameId,
      memberId,
    });
  }

  const game = await getGameById(gameId);
  if (!game) {
    throw new Error('Gagal membuat permainan');
  }
  return game;
}

export async function buildBillPreviewForGame(
  game: GameWithDetails,
  shuttlecockUsed: number,
  attendanceChargedMap?: Map<string, Set<string>>
): Promise<GameBillPreview> {
  const config = await getConfiguration();
  const map = attendanceChargedMap ?? await getAttendanceChargedMembersByDate();
  const calendarDate = getCalendarDateInJakarta(game.gameDate);
  return calculateBillPreview(
    config,
    shuttlecockUsed,
    game.players.map((p) => ({ memberId: p.memberId, memberName: p.memberName })),
    calendarDate,
    map
  );
}

export async function settleGame(
  gameId: string,
  shuttlecockUsed: number
): Promise<{ game: GameWithDetails; settlement: GameSettlement; preview: GameBillPreview }> {
  if (!Number.isInteger(shuttlecockUsed) || shuttlecockUsed <= 0) {
    throw new Error('Jumlah shuttlecock harus bilangan bulat positif');
  }

  const game = await getGameById(gameId);
  if (!game) {
    throw new Error('Permainan tidak ditemukan');
  }
  if (game.status === 'FINISHED') {
    throw new Error('Permainan sudah selesai');
  }
  if (game.players.length !== 4) {
    throw new Error('Permainan harus memiliki tepat 4 pemain');
  }
  if (game.billsGenerated) {
    throw new Error('Tagihan sudah digenerate untuk permainan ini');
  }

  const config = await getConfiguration();
  const attendanceMap = await getAttendanceChargedMembersByDate();
  const preview = calculateBillPreview(
    config,
    shuttlecockUsed,
    game.players.map((p) => ({ memberId: p.memberId, memberName: p.memberName })),
    getCalendarDateInJakarta(game.gameDate),
    attendanceMap
  );

  const spreadsheetId = getBadmintonSpreadsheetId();
  await ensureBadmintonSheetsOnce();
  await ensureSheetWithHeaders(spreadsheetId, GAME_SETTLEMENT_SHEET, [...GAME_SETTLEMENT_HEADERS]);

  const createdDate = new Date().toISOString();
  const settlementPayload = {
    shuttlecockUsed: String(shuttlecockUsed),
    shuttlecockPrice: String(config.defaultShuttlecockPrice),
    attendanceFee: String(config.attendanceFee),
    totalBillAmount: String(preview.billAmountPerMember),
    createdDate,
  };

  const existingSettlement = await getSettlementByGameId(gameId);
  let settlement: GameSettlement;

  if (existingSettlement) {
    await updateRowById(spreadsheetId, GAME_SETTLEMENT_SHEET, existingSettlement.id, settlementPayload);
    settlement = {
      id: existingSettlement.id,
      gameId,
      shuttlecockUsed,
      shuttlecockPrice: config.defaultShuttlecockPrice,
      attendanceFee: config.attendanceFee,
      totalBillAmount: preview.billAmountPerMember,
      shuttlecockPerPerson: preview.shuttlecockPerPerson,
      createdDate,
    };
  } else {
    const { id } = await createRowWithId(spreadsheetId, GAME_SETTLEMENT_SHEET, {
      gameId,
      ...settlementPayload,
    });
    settlement = {
      id,
      gameId,
      shuttlecockUsed,
      shuttlecockPrice: config.defaultShuttlecockPrice,
      attendanceFee: config.attendanceFee,
      totalBillAmount: preview.billAmountPerMember,
      shuttlecockPerPerson: preview.shuttlecockPerPerson,
      createdDate,
    };
  }

  const updatedGame = await getGameById(gameId);
  if (!updatedGame) {
    throw new Error('Gagal memuat permainan');
  }

  return { game: updatedGame, settlement, preview };
}

async function createBillsForGame(
  game: GameWithDetails,
  attendanceChargedMap: Map<string, Set<string>>
): Promise<number> {
  const settlement = await getSettlementByGameId(game.id);
  if (!settlement) {
    throw new Error(`Permainan ${game.id} belum diselesaikan`);
  }

  const config = await getConfiguration();
  const calendarDate = getCalendarDateInJakarta(game.gameDate);
  const preview = calculateBillPreview(
    config,
    settlement.shuttlecockUsed,
    game.players.map((p) => ({ memberId: p.memberId, memberName: p.memberName })),
    calendarDate,
    attendanceChargedMap
  );

  const spreadsheetId = getBadmintonSpreadsheetId();
  await ensureSheetWithHeaders(spreadsheetId, MEMBER_BILLS_SHEET, [...MEMBER_BILL_HEADERS]);

  const createdDate = new Date().toISOString().slice(0, 10);

  for (const playerBill of preview.players) {
    await createRowWithId(spreadsheetId, MEMBER_BILLS_SHEET, {
      gameId: game.id,
      memberId: playerBill.memberId,
      billAmount: String(playerBill.billAmount),
      attendanceFeeAmount: String(playerBill.attendanceFeeAmount),
      shuttlecockFeeAmount: String(playerBill.shuttlecockFeeAmount),
      paidAmount: '0',
      outstandingAmount: String(playerBill.billAmount),
      paymentStatus: 'UNPAID',
      createdDate,
    });

    if (playerBill.attendanceFeeAmount > 0) {
      markAttendanceCharged(attendanceChargedMap, calendarDate, playerBill.memberId);
    }
  }

  await updateRowById(spreadsheetId, GAMES_SHEET, game.id, { status: 'FINISHED' });
  return preview.players.length;
}

export async function generateAllPendingBills(): Promise<BatchGenerateBillsResult> {
  const readyGames = await listGamesReadyForBilling();
  if (readyGames.length === 0) {
    throw new Error('Tidak ada permainan siap untuk generate tagihan');
  }

  const attendanceChargedMap = await getAttendanceChargedMembersByDate();
  let billsCreated = 0;

  for (const game of readyGames) {
    billsCreated += await createBillsForGame(game, attendanceChargedMap);
  }

  const bills = await listBillsWithDetails();

  return {
    gamesProcessed: readyGames.length,
    billsCreated,
    bills,
  };
}
