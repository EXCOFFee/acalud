-- Permitir que las actividades existan sin aula asignada
ALTER TABLE activities
    ALTER COLUMN "classroomId" DROP NOT NULL;
