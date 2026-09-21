-- The client list used to be readable by any signed-in account, so a client
-- could have listed every other ViiA client through the API. Each role now
-- reads only the clients it needs:
--   manager / commercial : all clients (they place and follow orders for anyone)
--   client               : their own record only
--   operator             : only the clients of the missions they are assigned to
--                          (their mission screen shows the client's name)
--   city / anonymous     : none

drop policy client_select on client;

create policy client_select on client for select using (
  app_role() in ('manager', 'commercial')
  or (app_role() = 'client' and id = app_client_id())
  or (
    app_role() = 'operator'
    and exists (
      select 1
      from mission m
      join mission_assignment ma on ma.mission_id = m.id
      where m.client_id = client.id and ma.operator_id = app_operator_id()
    )
  )
);
