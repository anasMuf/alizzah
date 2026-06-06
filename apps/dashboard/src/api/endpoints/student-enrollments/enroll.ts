/**
 * Custom hook: enroll a student into a class group.
 * POST /v1/students/:id/enrollments
 */
import { useMutation } from '@tanstack/react-query';
import { customInstance } from '../../mutator/custom-instance';

interface EnrollStudentRequest {
  class_group_id: number;
  academic_year_id: number;
  enrollment_type: string;
  start_date: string;
}

export function usePostV1StudentsIdEnrollments() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: EnrollStudentRequest }) => {
      const resp = await customInstance<any>(
        `/v1/students/${id}/enrollments`,
        { method: 'POST', body: JSON.stringify(data) },
      );
      return resp.data;
    },
  });
}
