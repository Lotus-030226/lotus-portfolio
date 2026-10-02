from django.urls import path
from django.views.generic import RedirectView
from portfolio.api.studio import studio
from portfolio.api.jobs import Jobs, BackupDownload
from portfolio.api import auth
from portfolio.api.records import Records, RecordDetail, Reorder
from portfolio.api.assets import Assets, AssetFile, AssetDetail
urlpatterns = [path('', RedirectView.as_view(url='/studio/', permanent=False)), path('studio/', studio), path('studio/<path:asset>', studio), path('api/jobs/', Jobs.as_view()), path('api/jobs/<uuid:pk>/download/', BackupDownload.as_view()), path('api/assets/<uuid:pk>/', AssetDetail.as_view()), path('api/auth/session/', auth.session), path('api/auth/login/', auth.sign_in), path('api/auth/logout/', auth.sign_out), path('api/records/', Records.as_view()), path('api/records/<uuid:pk>/', RecordDetail.as_view()), path('api/reorder/', Reorder.as_view()), path('api/assets/', Assets.as_view()), path('api/assets/<uuid:pk>/file/', AssetFile.as_view())]
