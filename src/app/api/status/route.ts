import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function GET() {
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

  const { data: openTrades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "OPEN")
    .order("created_at", { ascending: false })
    .limit(1);

  const { data: priceData } = await supabase
    .from("price_feed")
    .select("*")
    .single();

  return NextResponse.json({
    price: priceData
      ? {
          price: priceData.price,
          timestamp: priceData.updated_at,
        }
      : null,
    openTrade: openTrades?.[0] ?? null,
    user: userData,
    botRunning: true,
  });
}
