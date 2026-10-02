from collections.abc import Mapping
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

class ManagementView(APIView):

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if request.method in {'POST', 'PATCH', 'DELETE'} and (not isinstance(request.data, Mapping)):
            raise ValidationError({'error': '請傳入物件格式的資料。'})
