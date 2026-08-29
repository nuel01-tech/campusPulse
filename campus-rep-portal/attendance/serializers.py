from rest_framework import serializers
from .models import LectureSession, Announcement, CampusDocument


class LectureSessionSerializer(serializers.ModelSerializer):
    attendee_count = serializers.SerializerMethodField()

    class Meta:
        model = LectureSession
        fields = '__all__'
        read_only_fields = ['department', 'is_active', 'has_ended', 'created_at']

    def get_attendee_count(self, obj):
        return obj.attendancerecord_set.count()


class AnnouncementSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source='posted_by.get_full_name', read_only=True)

    class Meta:
        model = Announcement
        fields = ['id', 'title', 'body', 'category', 'due_date', 'department', 'level', 'posted_by_name', 'created_at']
        read_only_fields = ['department', 'level', 'posted_by']


class CampusDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True)
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = CampusDocument
        fields = [
            'id', 'title', 'description', 'course_code', 'level',
            'department_name', 'file_name', 'file_size', 'uploaded_by_name', 'created_at'
        ]

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username

    def get_file_name(self, obj):
        return obj.file.name.rsplit('/', 1)[-1]

    def get_file_size(self, obj):
        try:
            return obj.file.size
        except (OSError, ValueError):
            return 0


class CampusDocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampusDocument
        fields = ['title', 'description', 'course_code', 'level', 'file']

    def validate_file(self, value):
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('PDF must be 10 MB or smaller.')
        if not value.name.lower().endswith('.pdf'):
            raise serializers.ValidationError('Only PDF files are allowed.')
        header = value.read(4)
        value.seek(0)
        if header != b'%PDF':
            raise serializers.ValidationError('The uploaded file is not a valid PDF.')
        return value
