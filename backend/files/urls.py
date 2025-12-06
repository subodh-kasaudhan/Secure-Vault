from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FileViewSet, storage_stats, remove_duplicates

router = DefaultRouter()
router.register(r'files', FileViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('stats/storage/', storage_stats, name='storage_stats'),
    path('remove-duplicates/', remove_duplicates, name='remove_duplicates'),
] 