create or replace function public.create_kolo_withdrawal(
  p_user_id uuid,
  p_amount integer,
  p_payment_method text,
  p_mobile_money_name text,
  p_mobile_money_number text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_current_balance integer;
  v_remaining_balance integer;
  v_withdrawal public.withdrawals%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object(
      'success', false,
      'code', 'invalid_amount',
      'message', 'Invalid withdrawal amount'
    );
  end if;

  select id, balance
  into v_wallet_id, v_current_balance
  from public.wallets
  where user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'code', 'wallet_not_found',
      'message', 'Wallet not found'
    );
  end if;

  if coalesce(v_current_balance, 0) < p_amount then
    return jsonb_build_object(
      'success', false,
      'code', 'insufficient_balance',
      'message', format(
        'Insufficient balance. Available: %s LD',
        coalesce(v_current_balance, 0)
      )
    );
  end if;

  update public.wallets
  set balance = balance - p_amount
  where id = v_wallet_id
  returning balance into v_remaining_balance;

  insert into public.withdrawals (
    user_id,
    amount,
    status,
    payment_method,
    mobile_money_name,
    mobile_money_number
  )
  values (
    p_user_id,
    p_amount,
    'pending',
    p_payment_method,
    p_mobile_money_name,
    p_mobile_money_number
  )
  returning * into v_withdrawal;

  return jsonb_build_object(
    'success', true,
    'withdrawal', to_jsonb(v_withdrawal),
    'remaining_balance', v_remaining_balance
  );
end;
$$;

revoke execute on function public.create_kolo_withdrawal(
  uuid, integer, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_kolo_withdrawal(
  uuid, integer, text, text, text
) to service_role;
