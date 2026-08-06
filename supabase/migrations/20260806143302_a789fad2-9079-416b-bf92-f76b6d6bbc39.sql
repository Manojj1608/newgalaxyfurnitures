
grant usage on schema private to anon, authenticated;
grant execute on function private.is_staff(uuid) to anon, authenticated;
grant execute on function private.is_manager(uuid) to anon, authenticated;
