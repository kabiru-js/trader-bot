import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const AMOUNT = 1000;
  const currentBalance = parseFloat(userData?.wallet_balance ?? 0);
  const currentDeposits = parseFloat(userData?.total_deposits ?? 0);
  const newBalance = currentBalance + AMOUNT;
  const newDeposits = currentDeposits + AMOUNT;
  const initialBalance =
    currentDeposits === 0 ? AMOUNT : parseFloat(userData?.initial_balance ?? 0);

  const { error } = await supabase
    .from("users")
    .update({
      wallet_balance: newBalance,
      total_deposits: newDeposits,
      initial_balance: initialBalance,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    wallet_balance: newBalance,
    total_deposits: newDeposits,
    initial_balance: initialBalance,
  });
}
