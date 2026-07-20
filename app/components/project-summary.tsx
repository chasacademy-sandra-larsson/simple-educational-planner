"use client";

import type { ProjectWithDetails, Teacher, Room } from '@/app/lib/api/types';

interface ProjectSummaryProps {
    project: ProjectWithDetails;
    teachers: Teacher[];
    rooms: Room[];
}

export default function ProjectSummary({ project, teachers, rooms }: ProjectSummaryProps) {
    // Helper function to format academic year
    const formatAcademicYear = (startYear: number, year: number): string => {
        const academicStartYear = startYear + (year - 1);
        const academicEndYear = academicStartYear + 1;
        return `${academicStartYear}/${academicEndYear}`;
    };

    // Calculate statistics
    const totalClasses = project.classes?.length || 0;
    const activeClasses = project.classes?.filter(c => c.isActive === 1).length || 0;
    const totalTeachers = teachers.length;
    const totalRooms = rooms.length;
    
    // Calculate total capacity
    const totalRoomCapacity = rooms.reduce((sum, room) => sum + (room.capacity || 0), 0);
    
    // Calculate courses and points per class
    const classesWithStats = project.classes?.map(cls => {
        const curriculum = cls.curriculum;
        const courseCount = curriculum?.courses?.length || 0;
        const totalPoints = curriculum?.totalPoints || 0;
        const isValid = curriculum?.isValid === 1;
        
        return {
            ...cls,
            courseCount,
            totalPoints,
            isValid,
        };
    }) || [];

    // Calculate points by academic year
    const pointsByAcademicYear = new Map<string, number>();
    project.classes?.forEach(cls => {
        if (cls.curriculum && cls.curriculum.courses) {
            cls.curriculum.courses.forEach((course: any) => {
                const academicYear = formatAcademicYear(cls.startYear, course.year);
                const currentPoints = pointsByAcademicYear.get(academicYear) || 0;
                pointsByAcademicYear.set(academicYear, currentPoints + (course.points || 0));
            });
        }
    });

    // Format time settings
    const formatTime = (time: string | undefined): string => {
        if (!time) return 'Ej angivet';
        // Convert "HH:MM:SS" to "HH:MM"
        return time.substring(0, 5);
    };

    const formatDuration = (minutes: number | undefined): string => {
        if (!minutes) return 'Ej angivet';
        return `${minutes} min`;
    };

    return (
        <div className="space-y-6">
            {/* Project Overview */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="text-2xl font-bold text-foreground mb-4">
                    Projektöversikt
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-accent rounded-lg border border-primary">
                        <div className="text-sm font-medium text-primary mb-1">
                            Totalt antal klasser
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                            {totalClasses}
                        </div>
                        <div className="text-xs text-primary mt-1">
                            {activeClasses} aktiva
                        </div>
                    </div>
                    
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary">
                        <div className="text-sm font-medium text-primary mb-1">
                            Antal lärare
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                            {totalTeachers}
                        </div>
                    </div>
                    
                    <div className="p-4 bg-muted rounded-lg border border-border">
                        <div className="text-sm font-medium text-accent-foreground mb-1">
                            Antal salar
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                            {totalRooms}
                        </div>
                        <div className="text-xs text-accent-foreground mt-1">
                            {totalRoomCapacity} platser totalt
                        </div>
                    </div>
                    
                    <div className="p-4 bg-accent rounded-lg border border-border">
                        <div className="text-sm font-medium text-accent-foreground mb-1">
                            Kurser planerade
                        </div>
                        <div className="text-3xl font-bold text-foreground">
                            {classesWithStats.reduce((sum, c) => sum + c.courseCount, 0)}
                        </div>
                        <div className="text-xs text-accent-foreground mt-1">
                            {classesWithStats.filter(c => c.isValid).length} klasser med 2500p
                        </div>
                    </div>
                </div>
            </div>

            {/* Time Settings */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                    Tidsinställningar
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                            Tidigaste lektionsstart
                        </div>
                        <div className="text-lg text-foreground">
                            {formatTime(project.earliestLessonStart)}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                            Senaste lektionsslut
                        </div>
                        <div className="text-lg text-foreground">
                            {formatTime(project.latestLessonEnd)}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                            Standard lektionslängd
                        </div>
                        <div className="text-lg text-foreground">
                            {formatDuration(project.defaultLessonDuration)}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                            Mentorstid per vecka
                        </div>
                        <div className="text-lg text-foreground">
                            {formatDuration(project.mentorTimePerWeek)}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                            Lunchlängd
                        </div>
                        <div className="text-lg text-foreground">
                            {formatDuration(project.lunchDuration)}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                            Lunchtid
                        </div>
                        <div className="text-lg text-foreground">
                            {formatTime(project.earliestLunchTime)} - {formatTime(project.latestLunchTime)}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                            Kortaste paus mellan lektioner
                        </div>
                        <div className="text-lg text-foreground">
                            {formatDuration(project.shortestBreakBetweenLessons)}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                            Längsta paus mellan lektioner
                        </div>
                        <div className="text-lg text-foreground">
                            {formatDuration(project.longestBreakBetweenLessons)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Classes Summary */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                    Klasser
                </h3>
                <div className="space-y-3">
                    {classesWithStats.map((cls) => (
                        <div
                            key={cls.id}
                            className="p-4 bg-muted rounded-lg border border-border"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-semibold text-foreground">
                                            {cls.classCode}
                                        </span>
                                        {cls.isValid && (
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                                                ✓ 2500p
                                            </span>
                                        )}
                                        {!cls.isValid && cls.totalPoints > 0 && (
                                            <span className="px-2 py-0.5 bg-accent text-accent-foreground text-xs rounded-full">
                                                {cls.totalPoints}p
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {cls.programName}
                                        {cls.orientationName && cls.orientationName !== cls.programName && (
                                            <span> • {cls.orientationName}</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {cls.startYear} - {cls.graduationYear} • {cls.courseCount} kurser
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        {cls.totalPoints} poäng
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {totalClasses === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            Inga klasser tillagda ännu
                        </div>
                    )}
                </div>
            </div>

            {/* Teachers Summary */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                    Lärare
                </h3>
                {totalTeachers > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {teachers.map((teacher) => (
                            <div
                                key={teacher.id}
                                className="p-3 bg-muted rounded-lg border border-border"
                            >
                                <div className="font-medium text-foreground">
                                    {teacher.name}
                                </div>
                                {teacher.email && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {teacher.email}
                                    </div>
                                )}
                                {teacher.subject && (
                                    <div className="text-sm text-primary mt-1">
                                        {teacher.subject}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        Inga lärare tillagda ännu
                    </div>
                )}
            </div>

            {/* Rooms Summary */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="text-xl font-bold text-foreground mb-4">
                    Salar
                </h3>
                {totalRooms > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="p-3 bg-muted rounded-lg border border-border"
                            >
                                <div className="font-medium text-foreground">
                                    {room.roomNumber}
                                </div>
                                {room.roomType && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {room.roomType}
                                    </div>
                                )}
                                {room.capacity && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                        {room.capacity} platser
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        Inga salar tillagda ännu
                    </div>
                )}
            </div>

            {/* Points by Academic Year */}
            {pointsByAcademicYear.size > 0 && (
                <div className="bg-card rounded-lg border border-border p-6">
                    <h3 className="text-xl font-bold text-foreground mb-4">
                        Poäng per läsår
                    </h3>
                    <div className="space-y-2">
                        {Array.from(pointsByAcademicYear.entries())
                            .sort((a, b) => {
                                const yearA = parseInt(a[0].split('/')[0]);
                                const yearB = parseInt(b[0].split('/')[0]);
                                return yearA - yearB;
                            })
                            .map(([academicYear, points]) => (
                                <div
                                    key={academicYear}
                                    className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                                >
                                    <div className="font-medium text-foreground">
                                        Läsår {academicYear}
                                    </div>
                                    <div className="text-lg font-bold text-primary">
                                        {points.toLocaleString('sv-SE')} poäng
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </div>
    );
}

