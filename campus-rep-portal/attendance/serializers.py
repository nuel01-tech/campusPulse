from rest_framework import serializers
from .models import LectureSession


class LectureSessionSerializer(serializers.ModelSerializer):
    attendee_count = serializers.SerializerMethodField()

    class Meta:
        model = LectureSession
        fields = '__all__'
        read_only_fields = ['department', 'is_active']

    def get_attendee_count(self, obj):
        return obj.attendancerecord_set.count()
from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source='posted_by.get_full_name', read_only=True)

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'body', 'category', 'due_date', 'department', 'level', 'posted_by_name', 'created_at']
        read_only_fields = ['department', 'level', 'posted_by']