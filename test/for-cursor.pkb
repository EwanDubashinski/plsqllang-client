BEGIN
   FOR item IN (
     SELECT last_name, job_id
     FROM
     WHERE job_id LIKE '%CLERK%'
     AND manager_id > 120
     ORDER BY last_name
   )
   LOOP
     DBMS_OUTPUT.PUT_LINE
       (q'['Name' = ]' || item.last_name || ', Job = ' || item.job_id);
   END LOOP;
 END;
 /
