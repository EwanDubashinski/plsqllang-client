set define on
@kkk.sql

BEGIN
   FOR item IN (
     SELECT last_name, job_id
     FROM EMPLOYEES
     WHERE job_id LIKE '%CLERK%'
     AND manager_id > 120
     ORDER BY last_name
   )
   LOOP
     DBMS_OUTPUT.PUT_LINE
       (q'['Name' = ]' || item.last_name || ', Job = ' || item.job_id);
   END LOOP;
   INSERT INTO x VALUES y RETURNING x.id into ls;
 END;
 /
