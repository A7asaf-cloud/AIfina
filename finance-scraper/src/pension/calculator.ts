import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/schema.js';

interface PensionProfile {
  id: string;
  display_name: string;
  gross_salary: number;
  salary_effective_date: string;
  kh_employer_pct: number;
  kh_employee_pct: number;
  kh_ceiling: number;
  kh_start_date: string;
  kh_current_balance: number;
  kh_last_manual_balance_date: string | null;
  pension_employer_pct: number;
  pension_employee_pct: number;
  pension_employer_compensation_pct: number;
  pension_ceiling: number;
  pension_start_date: string;
  pension_current_balance: number;
  pension_last_manual_balance_date: string | null;
  disability_pct: number;
}

interface MonthlySnapshot {
  id: string;
  profile_id: string;
  year: number;
  month: number;
  gross_salary: number;
  kh_taxable_salary: number;
  kh_employer_deposit: number;
  kh_employee_deposit: number;
  kh_total_deposit: number;
  kh_cumulative_balance: number;
  pension_taxable_salary: number;
  pension_employer_deposit: number;
  pension_employee_deposit: number;
  pension_employer_compensation: number;
  pension_total_deposit: number;
  pension_cumulative_balance: number;
  total_monthly_deposit: number;
  total_cumulative: number;
}

function calcMonth(profile: PensionProfile, khBalance: number, pensionBalance: number): Omit<MonthlySnapshot, 'id' | 'profile_id' | 'year' | 'month'> {
  const khTaxable = Math.min(profile.gross_salary, profile.kh_ceiling);
  const khEmployer = khTaxable * (profile.kh_employer_pct / 100);
  const khEmployee = khTaxable * (profile.kh_employee_pct / 100);
  const khTotal = khEmployer + khEmployee;
  const khCumulative = khBalance + khTotal;

  const pensionTaxable = Math.min(profile.gross_salary, profile.pension_ceiling);
  const pensionEmployer = pensionTaxable * (profile.pension_employer_pct / 100);
  const pensionEmployee = pensionTaxable * (profile.pension_employee_pct / 100);
  const pensionCompensation = pensionTaxable * (profile.pension_employer_compensation_pct / 100);
  const pensionTotal = pensionEmployer + pensionEmployee + pensionCompensation;
  const pensionCumulative = pensionBalance + pensionTotal;

  return {
    gross_salary: profile.gross_salary,
    kh_taxable_salary: khTaxable,
    kh_employer_deposit: khEmployer,
    kh_employee_deposit: khEmployee,
    kh_total_deposit: khTotal,
    kh_cumulative_balance: khCumulative,
    pension_taxable_salary: pensionTaxable,
    pension_employer_deposit: pensionEmployer,
    pension_employee_deposit: pensionEmployee,
    pension_employer_compensation: pensionCompensation,
    pension_total_deposit: pensionTotal,
    pension_cumulative_balance: pensionCumulative,
    total_monthly_deposit: khTotal + pensionTotal,
    total_cumulative: khCumulative + pensionCumulative,
  };
}

export function generateMonthlySnapshots(
  profileId: string,
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): MonthlySnapshot[] {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM pension_profiles WHERE id = ?').get(profileId) as PensionProfile | undefined;
  if (!profile) throw new Error(`Profile not found: ${profileId}`);

  // Find the most recent snapshot before fromYear/fromMonth to get starting balances
  const prev = db.prepare(
    `SELECT kh_cumulative_balance, pension_cumulative_balance
     FROM pension_monthly_snapshots
     WHERE profile_id = ? AND (year < ? OR (year = ? AND month < ?))
     ORDER BY year DESC, month DESC LIMIT 1`
  ).get(profileId, fromYear, fromYear, fromMonth) as
    | { kh_cumulative_balance: number; pension_cumulative_balance: number }
    | undefined;

  let khBalance = prev?.kh_cumulative_balance ?? (profile.kh_current_balance ?? 0);
  let pensionBalance = prev?.pension_cumulative_balance ?? (profile.pension_current_balance ?? 0);

  const insert = db.prepare(
    `INSERT OR REPLACE INTO pension_monthly_snapshots
      (id, profile_id, year, month, gross_salary,
       kh_taxable_salary, kh_employer_deposit, kh_employee_deposit, kh_total_deposit, kh_cumulative_balance,
       pension_taxable_salary, pension_employer_deposit, pension_employee_deposit,
       pension_employer_compensation, pension_total_deposit, pension_cumulative_balance,
       total_monthly_deposit, total_cumulative)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );

  const results: MonthlySnapshot[] = [];
  let year = fromYear;
  let month = fromMonth;

  while (year < toYear || (year === toYear && month <= toMonth)) {
    const calc = calcMonth(profile, khBalance, pensionBalance);
    const snap: MonthlySnapshot = { id: uuidv4(), profile_id: profileId, year, month, ...calc };

    insert.run(
      snap.id, snap.profile_id, snap.year, snap.month, snap.gross_salary,
      snap.kh_taxable_salary, snap.kh_employer_deposit, snap.kh_employee_deposit,
      snap.kh_total_deposit, snap.kh_cumulative_balance,
      snap.pension_taxable_salary, snap.pension_employer_deposit, snap.pension_employee_deposit,
      snap.pension_employer_compensation, snap.pension_total_deposit, snap.pension_cumulative_balance,
      snap.total_monthly_deposit, snap.total_cumulative
    );

    khBalance = snap.kh_cumulative_balance;
    pensionBalance = snap.pension_cumulative_balance;
    results.push(snap);

    month++;
    if (month > 12) { month = 1; year++; }
  }

  return results;
}

export function getProjections(
  profileId: string,
  yearsAhead: number
): object {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM pension_profiles WHERE id = ?').get(profileId) as PensionProfile | undefined;
  if (!profile) throw new Error(`Profile not found: ${profileId}`);

  const latest = db.prepare(
    `SELECT * FROM pension_monthly_snapshots WHERE profile_id = ? ORDER BY year DESC, month DESC LIMIT 1`
  ).get(profileId) as MonthlySnapshot | undefined;

  const khBalance = latest?.kh_cumulative_balance ?? (profile.kh_current_balance ?? 0);
  const pensionBalance = latest?.pension_cumulative_balance ?? (profile.pension_current_balance ?? 0);

  const now = new Date();
  const projections: object[] = [];
  let curKh = khBalance;
  let curPension = pensionBalance;

  for (let i = 1; i <= yearsAhead * 12; i++) {
    const calc = calcMonth(profile, curKh, curPension);
    curKh = calc.kh_cumulative_balance;
    curPension = calc.pension_cumulative_balance;

    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    if (d.getMonth() === 11) { // December — annual snapshot
      projections.push({
        year: d.getFullYear(),
        month: 12,
        kh_balance: Math.round(curKh),
        pension_balance: Math.round(curPension),
        total: Math.round(curKh + curPension),
      });
    }
  }

  // KH liquidity
  const khStart = new Date(profile.kh_start_date);
  const khLiquidDate = new Date(khStart);
  khLiquidDate.setFullYear(khLiquidDate.getFullYear() + 6);
  const monthsSinceStart = Math.floor((now.getTime() - khStart.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const khIsLiquid = monthsSinceStart >= 72;

  // Find KH balance at liquidity date
  const liquidYear = khLiquidDate.getFullYear();
  const liquidMonth = khLiquidDate.getMonth() + 1;
  let khAtLiquidity = khBalance;
  let p = pensionBalance;
  const totalFuture = yearsAhead * 12;
  for (let i = 1; i <= totalFuture; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const calc = calcMonth(profile, khAtLiquidity, p);
    khAtLiquidity = calc.kh_cumulative_balance;
    p = calc.pension_cumulative_balance;
    if (d.getFullYear() === liquidYear && d.getMonth() + 1 === liquidMonth) break;
  }

  return {
    profile_id: profileId,
    current_month: {
      kh_balance: Math.round(khBalance),
      pension_balance: Math.round(pensionBalance),
      total: Math.round(khBalance + pensionBalance),
    },
    projections,
    kh_liquid_date: khLiquidDate.toISOString().slice(0, 10),
    kh_is_liquid: khIsLiquid,
    kh_balance_at_liquidity: khIsLiquid ? Math.round(khBalance) : Math.round(khAtLiquidity),
    pension_balance_at_age_67: Math.round(curPension),
  };
}

export function getKhLiquidity(profileId: string): object {
  const db = getDb();
  const profile = db.prepare('SELECT kh_start_date FROM pension_profiles WHERE id = ?').get(profileId) as
    | { kh_start_date: string }
    | undefined;
  if (!profile) throw new Error(`Profile not found: ${profileId}`);

  const khStart = new Date(profile.kh_start_date);
  const now = new Date();
  const monthsSinceStart = Math.floor((now.getTime() - khStart.getTime()) / (1000 * 60 * 60 * 24 * 30));

  const liquidDate = new Date(khStart);
  liquidDate.setFullYear(liquidDate.getFullYear() + 6);
  const partialLiquidDate = new Date(khStart);
  partialLiquidDate.setFullYear(partialLiquidDate.getFullYear() + 3);

  return {
    kh_is_liquid: monthsSinceStart >= 72,
    kh_liquid_date: liquidDate.toISOString().slice(0, 10),
    kh_months_remaining: Math.max(0, 72 - monthsSinceStart),
    is_partial_liquid: monthsSinceStart >= 36,
    partial_liquid_date: partialLiquidDate.toISOString().slice(0, 10),
  };
}

export function recalculateFromManualBalance(profileId: string): void {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM pension_profiles WHERE id = ?').get(profileId) as PensionProfile | undefined;
  if (!profile) throw new Error(`Profile not found: ${profileId}`);

  const refDate = profile.kh_last_manual_balance_date ?? profile.pension_last_manual_balance_date;
  if (!refDate) return;

  const d = new Date(refDate);
  db.prepare(
    `DELETE FROM pension_monthly_snapshots
     WHERE profile_id = ? AND (year > ? OR (year = ? AND month >= ?))`
  ).run(profileId, d.getFullYear(), d.getFullYear(), d.getMonth() + 1);

  const now = new Date();
  generateMonthlySnapshots(
    profileId,
    d.getFullYear(),
    d.getMonth() + 1,
    now.getFullYear(),
    now.getMonth() + 1
  );
}
