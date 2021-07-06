CREATE OR REPLACE PACKAGE BODY p_val IS
-- $Id: p_tbledit.pks 1393 2019-03-06 16:06:32Z mnakhalo $
-- $URL: https://seu10.gdc-bln03.t-systems.com/svn/BISSKDM/Sourcecode/biss-apex-demo/plsql/p_tbledit.pks $
-- $Author: mnakhalo $
-- $Date: 2019-03-06 19:06:32 +0300 (Ð¡Ñ, 06 ÐŒÐ°Ñ 2019) $
-- $Revision: 1393 $b

   cs_revision CONSTANT VARCHAR2(50) := '$Revision: 1393 $';

   PROCEDURE assign(is_target OUT VARCHAR2, is_source IN VARCHAR2)
   IS
   BEGIN
      is_target := is_source;
   EXCEPTION
      WHEN OTHERS
      THEN
         dbms_output.put_line(sqlerrm);
   END;

   FUNCTION testx RETURN BOOLEAN
   IS
      lb_result BOOLEAN;
   BEGIN
      RETURN lb_result;
   END;

END p_val;
/
show errors
