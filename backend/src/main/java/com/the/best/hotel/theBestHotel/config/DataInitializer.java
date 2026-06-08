package com.the.best.hotel.theBestHotel.config;

import com.the.best.hotel.theBestHotel.model.Booking;
import com.the.best.hotel.theBestHotel.model.Client;
import com.the.best.hotel.theBestHotel.model.Employee;
import com.the.best.hotel.theBestHotel.model.Product;
import com.the.best.hotel.theBestHotel.model.Room;
import com.the.best.hotel.theBestHotel.model.Stay;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.repository.BookingRepository;
import com.the.best.hotel.theBestHotel.repository.ClientRepository;
import com.the.best.hotel.theBestHotel.repository.EmployeeRepository;
import com.the.best.hotel.theBestHotel.repository.ProductRepository;
import com.the.best.hotel.theBestHotel.repository.RoomRepository;
import com.the.best.hotel.theBestHotel.repository.StayRepository;
import com.the.best.hotel.theBestHotel.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final ClientRepository clientRepository;
    private final RoomRepository roomRepository;
    private final ProductRepository productRepository;
    private final BookingRepository bookingRepository;
    private final StayRepository stayRepository;
    private final PasswordEncoder passwordEncoder;

    private static final Random RNG = new Random();

    private static final List<String> TIPOS_QUARTO = List.of(
        "Standard",
        "Deluxe",
        "Master Suite",
        "Presidential Suite"
    );

    private static final List<String> PRODUTO_NOME = List.of(
        "Agua mineral",
        "Suco",
        "Refrigerante",
        "Cerveja",
        "Vinho",
        "Cafe",
        "Cha",
        "Leite",
        "Salgadinho",
        "Biscoito",
        "Chocolate",
        "Sorvete",
        "Barra de cereal",
        "Pao",
        "Sanduiche",
        "Agua tonica",
        "Energético",
        "Isotonico",
        "Queijo",
        "Presunto"
    );

    private static final List<String> PRODUTO_DETALHE = List.of(
        "natural",
        "com acucar",
        "diet",
        "zero",
        "artesanal",
        "importado",
        "tradicional",
        "premium",
        "integral",
        "light",
        "torrado",
        "moido",
        "em po",
        "lata",
        "garrafa"
    );

    private static final List<String> PRODUTO_CATEGORIA = List.of(
        "Bebidas",
        "Alimentos",
        "Higiene",
        "Diversos"
    );

    private static final List<String> NOMES = List.of(
        "joao",
        "maria",
        "pedro",
        "carlos",
        "ana",
        "lucas",
        "julia",
        "rafael",
        "beatriz",
        "gabriel",
        "fernanda",
        "rodrigo",
        "camila",
        "felipe",
        "amanda"
    );

    @Override
    public void run(String... args) {
        seedRooms(100);
        seedProducts(250);

        seedFromNameList(20, User.Role.EMPLOYEE);
        seedFromNameList(120, User.Role.CLIENT);

        createIfNotExists("admin@gmail.com", "admin123", User.Role.ADMIN);
        createIfNotExists(
            "funcionario@gmail.com",
            "func123",
            User.Role.EMPLOYEE
        );
        createIfNotExists("cliente@gmail.com", "cliente123", User.Role.CLIENT);

        seedBookingsAndStays(100, 67, 23);
    }

    private void createIfNotExists(
        String email,
        String password,
        User.Role role
    ) {
        if (userRepository.existsByEmail(email)) return;

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setRole(role);

        user = userRepository.save(user);

        if (role == User.Role.EMPLOYEE) {
            Employee emp = new Employee();
            emp.setName("Funcionario " + email);
            emp.setCpf("000.000.000-01");
            emp.setPhone("(11) 99999-0000");
            emp.setUserId(user.getId());
            emp = employeeRepository.save(emp);
            user.setRefId(emp.getId());
            userRepository.save(user);
        } else if (role == User.Role.CLIENT) {
            Client cli = new Client();
            cli.setName("Cliente " + email);
            cli.setCpf("000.000.000-02");
            cli.setEmail(email);
            cli.setPhone("(11) 99999-0001");
            cli.setAddress("Endereco padrao");
            cli = clientRepository.save(cli);
            user.setRefId(cli.getId());
            userRepository.save(user);
        }

        System.out.println("Usuario criado: " + email + " (" + role + ")");
    }

    private void seedFromNameList(int count, User.Role role) {
        if (
            role == User.Role.EMPLOYEE && employeeRepository.count() > 0
        ) return;
        if (role == User.Role.CLIENT && clientRepository.count() > 0) return;

        int created = 0;

        while (created < count) {
            String nome = NOMES.get((int) (NOMES.size() * Math.random()));
            String email = "";
            int i = 0;

            do {
                email = nome + (i++) + "@gmail.com";
            } while (userRepository.existsByEmail(email));

            User user = new User();
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(nome + "123"));
            user.setRole(role);
            user = userRepository.save(user);

            String cpf = String.format(
                "%03d.%03d.%03d-%02d",
                RNG.nextInt(1000),
                RNG.nextInt(1000),
                RNG.nextInt(1000),
                RNG.nextInt(100)
            );
            String phone = String.format(
                "(11) 9%04d-%04d",
                RNG.nextInt(10000),
                RNG.nextInt(10000)
            );

            if (role == User.Role.EMPLOYEE) {
                Employee emp = new Employee();
                emp.setName(capitalize(nome));
                emp.setCpf(cpf);
                emp.setPhone(phone);
                emp.setUserId(user.getId());
                emp = employeeRepository.save(emp);
                user.setRefId(emp.getId());
                userRepository.save(user);
                System.out.println("Funcionario criado: " + email);
            } else if (role == User.Role.CLIENT) {
                Client cli = new Client();
                cli.setName(capitalize(nome));
                cli.setCpf(cpf);
                cli.setEmail(email);
                cli.setPhone(phone);
                cli.setAddress(
                    "Rua " + capitalize(nome) + ", " + RNG.nextInt(1000)
                );
                cli = clientRepository.save(cli);
                user.setRefId(cli.getId());
                userRepository.save(user);
                System.out.println("Cliente criado: " + email);
            }

            created++;
        }
    }

    private void seedRooms(int n) {
        if (roomRepository.count() > 0) return;

        java.util.HashMap<String, Integer> contador = new java.util.HashMap<>();

        for (int i = 0; i < n; i++) {
            String tipo = TIPOS_QUARTO.get(RNG.nextInt(TIPOS_QUARTO.size()));
            int prefixo = TIPOS_QUARTO.indexOf(tipo) + 1;
            int seq = contador.merge(tipo, 1, Integer::sum);
            int capacidade;
            double diaria;

            switch (tipo) {
                case "Deluxe" -> {
                    capacidade = RNG.nextInt(2, 5);
                    diaria = RNG.nextInt(250, 451);
                }
                case "Master Suite" -> {
                    capacidade = 2;
                    diaria = RNG.nextInt(500, 801);
                }
                case "Presidential Suite" -> {
                    capacidade = RNG.nextInt(2, 7);
                    diaria = RNG.nextInt(900, 1501);
                }
                default -> {
                    capacidade = RNG.nextInt(2, 4);
                    diaria = RNG.nextInt(120, 201);
                }
            }

            String numero = prefixo + String.format("%02d", seq);

            Room room = new Room();
            room.setNumber(numero);
            room.setType(tipo);
            room.setDescription(
                "Quarto " +
                    tipo +
                    " com capacidade para " +
                    capacidade +
                    " pessoas"
            );
            room.setCapacity(capacidade);
            room.setDailyRate(diaria);
            room.setStatus(Room.Status.AVAILABLE);

            roomRepository.save(room);
            System.out.println("Quarto criado: " + numero + " (" + tipo + ")");
        }
    }

    private void seedProducts(int n) {
        if (productRepository.count() > 0) return;

        Set<String> usados = new HashSet<>();

        for (int i = 0; i < n; i++) {
            String nome;
            do {
                nome =
                    PRODUTO_NOME.get(RNG.nextInt(PRODUTO_NOME.size())) +
                    " " +
                    PRODUTO_DETALHE.get(RNG.nextInt(PRODUTO_DETALHE.size()));
            } while (usados.contains(nome));
            usados.add(nome);

            Product product = new Product();
            product.setName(nome);
            product.setCategory(
                PRODUTO_CATEGORIA.get(RNG.nextInt(PRODUTO_CATEGORIA.size()))
            );
            product.setPrice(RNG.nextInt(3, 50) + 0.99);
            product.setActive(true);

            productRepository.save(product);
            System.out.println(
                "Produto criado: " + nome + " (" + product.getCategory() + ")"
            );
        }
    }

    private void seedBookingsAndStays(int nBookings, int nActive, int nClosed) {
        if (bookingRepository.count() > 0) return;

        List<Room> allRooms = roomRepository.findAll();
        List<Client> allClients = clientRepository.findAll();
        List<Product> allProducts = productRepository.findAll();

        if (
            allRooms.isEmpty() || allClients.isEmpty() || allProducts.isEmpty()
        ) return;

        LocalDate today = LocalDate.now();
        int nRemaining = nBookings - nActive - nClosed;
        int nPending = (int) (nRemaining * 0.4);
        int nConfirmed = (int) (nRemaining * 0.4);
        int nCancelled = nRemaining - nPending - nConfirmed;

        // Build status list and shuffle
        List<Booking.Status> statuses = new ArrayList<>();
        for (int i = 0; i < nPending; i++) statuses.add(Booking.Status.PENDING);
        for (int i = 0; i < nConfirmed; i++) statuses.add(
            Booking.Status.CONFIRMED
        );
        for (int i = 0; i < nCancelled; i++) statuses.add(
            Booking.Status.CANCELLED
        );
        for (int i = 0; i < nActive; i++) statuses.add(Booking.Status.CHECKIN);
        for (int i = 0; i < nClosed; i++) statuses.add(Booking.Status.CHECKOUT);
        Collections.shuffle(statuses, RNG);

        int clientIdx = 0;
        int roomIdx = 0;

        for (Booking.Status status : statuses) {
            int offset;
            int pastDays = 10;
            int futureDays = 7;

            if (
                status == Booking.Status.PENDING ||
                status == Booking.Status.CONFIRMED
            ) {
                offset = RNG.nextInt(1, futureDays + 1);
            } else if (status == Booking.Status.CANCELLED) {
                offset = -RNG.nextInt(1, pastDays + 1);
            } else if (status == Booking.Status.CHECKIN) {
                offset = -RNG.nextInt(0, 4);
            } else {
                offset = -RNG.nextInt(5, pastDays + 1); // CHECKOUT farther in the past
            }

            int nights = RNG.nextInt(1, 5);
            LocalDate checkIn = today.plusDays(offset);
            LocalDate checkOut = checkIn.plusDays(nights);
            double dailyRate = RNG.nextInt(120, 800) + 0.99;

            Client client = allClients.get(clientIdx % allClients.size());
            clientIdx++;

            Room room = allRooms.get(roomIdx % allRooms.size());
            roomIdx++;

            Booking.Guest guest = new Booking.Guest();
            guest.setClientId(client.getId());
            guest.setHolder(true);

            Booking.BookedRoom bookedRoom = new Booking.BookedRoom();
            bookedRoom.setRoomId(room.getId());
            bookedRoom.setDailyRate(dailyRate);
            bookedRoom.setNumberOfGuests(
                RNG.nextInt(1, room.getCapacity() + 1)
            );

            Booking booking = new Booking();
            booking.setRooms(List.of(bookedRoom));
            booking.setGuests(List.of(guest));
            booking.setCheckInDate(checkIn);
            booking.setCheckOutDate(checkOut);
            booking.setAdvancePayment(dailyRate);
            booking.setStatus(status);
            booking.setCreatedAt(
                LocalDateTime.now().minusDays(RNG.nextInt(15))
            );

            if (status == Booking.Status.CANCELLED) {
                Booking.Cancellation cancel = new Booking.Cancellation();
                cancel.setCancelledAt(LocalDateTime.now().minusDays(3));
                cancel.setReason("Cliente desistiu");
                cancel.setRefundAmount(dailyRate * 0.5);
                booking.setCancellation(cancel);
            }

            bookingRepository.save(booking);
            System.out.println(
                "Reserva criada: " +
                    checkIn +
                    " -> " +
                    checkOut +
                    " (" +
                    status +
                    ")"
            );

            if (
                status == Booking.Status.CHECKIN ||
                status == Booking.Status.CHECKOUT
            ) {
                room.setStatus(Room.Status.OCCUPIED);
                roomRepository.save(room);
            }
        }

        // Set one random room to MAINTENANCE
        if (!allRooms.isEmpty()) {
            Room maintRoom = allRooms.get(RNG.nextInt(allRooms.size()));
            if (maintRoom.getStatus() == Room.Status.AVAILABLE) {
                maintRoom.setStatus(Room.Status.MAINTENANCE);
                roomRepository.save(maintRoom);
            }
        }

        // Create stays for CHECKIN bookings (ACTIVE)
        List<Booking> checkinBookings = bookingRepository.findByStatus(
            Booking.Status.CHECKIN
        );
        for (Booking b : checkinBookings) {
            ObjectId clientId = b
                .getGuests()
                .stream()
                .filter(Booking.Guest::isHolder)
                .map(Booking.Guest::getClientId)
                .findFirst()
                .orElse(null);

            Stay stay = new Stay();
            stay.setBookingId(b.getId());
            stay.setClientId(clientId);
            stay.setCheckInAt(b.getCheckInDate().atStartOfDay());
            stay.setStatus(Stay.Status.ACTIVE);
            stay.setConsumptions(new ArrayList<>());
            stay.setTotalDailies(0);
            stay.setTotalConsumptions(0);
            stay.setGrandTotal(0);

            int nCons = RNG.nextInt(2, 4);
            for (int i = 0; i < nCons; i++) {
                Product p = allProducts.get(RNG.nextInt(allProducts.size()));
                Stay.Consumption c = new Stay.Consumption();
                c.setId(UUID.randomUUID().toString());
                c.setProductId(p.getId());
                c.setProductName(p.getName());
                c.setQuantity(RNG.nextInt(1, 4));
                c.setUnitPrice(p.getPrice());
                c.setRegisteredAt(
                    stay.getCheckInAt().plusHours(RNG.nextInt(24))
                );
                Stay.DeliveryStatus[] activeStatuses = {
                    Stay.DeliveryStatus.FOR_DELIVERY,
                    Stay.DeliveryStatus.FOR_PICKUP,
                    Stay.DeliveryStatus.AWAITING_CONFIRMATION,
                    Stay.DeliveryStatus.DELIVERED,
                };
                c.setDeliveryStatus(
                    activeStatuses[RNG.nextInt(activeStatuses.length)]
                );
                c.setNotes(RNG.nextBoolean() ? "obs: " + p.getName() : null);
                stay.getConsumptions().add(c);
            }

            stayRepository.save(stay);
            System.out.println(
                "Estadia ativa criada para reserva " + b.getId()
            );
        }

        // Create stays for CHECKOUT bookings (CLOSED)
        List<Booking> checkoutBookings = bookingRepository.findByStatus(
            Booking.Status.CHECKOUT
        );
        for (Booking b : checkoutBookings) {
            ObjectId clientId = b
                .getGuests()
                .stream()
                .filter(Booking.Guest::isHolder)
                .map(Booking.Guest::getClientId)
                .findFirst()
                .orElse(null);

            LocalDateTime checkOutAt = b.getCheckOutDate().atStartOfDay();
            long days = ChronoUnit.DAYS.between(
                b.getCheckInDate(),
                b.getCheckOutDate()
            );
            if (days == 0) days = 1;

            double sumDailyRates =
                b.getRooms() != null
                    ? b
                          .getRooms()
                          .stream()
                          .mapToDouble(Booking.BookedRoom::getDailyRate)
                          .sum()
                    : 0;
            double totalDailies = days * sumDailyRates;
            double totalConsumptions = 0;

            Stay stay = new Stay();
            stay.setBookingId(b.getId());
            stay.setClientId(clientId);
            stay.setCheckInAt(b.getCheckInDate().atStartOfDay());
            stay.setCheckOutAt(checkOutAt);
            stay.setStatus(Stay.Status.CLOSED);
            stay.setConsumptions(new ArrayList<>());

            int nCons = RNG.nextInt(2, 4);
            for (int i = 0; i < nCons; i++) {
                Product p = allProducts.get(RNG.nextInt(allProducts.size()));
                Stay.Consumption c = new Stay.Consumption();
                c.setId(UUID.randomUUID().toString());
                c.setProductId(p.getId());
                c.setProductName(p.getName());
                c.setQuantity(RNG.nextInt(1, 4));
                c.setUnitPrice(p.getPrice());
                c.setRegisteredAt(
                    stay.getCheckInAt().plusHours(RNG.nextInt(24))
                );

                boolean cancelled = RNG.nextInt(5) == 0;
                if (cancelled) {
                    c.setDeliveryStatus(Stay.DeliveryStatus.CANCELLED);
                } else {
                    c.setDeliveryStatus(Stay.DeliveryStatus.DELIVERED);
                    c.setCompletedAt(
                        stay.getCheckInAt().plusHours(RNG.nextInt(12, 48))
                    );
                }

                stay.getConsumptions().add(c);
                if (!cancelled) {
                    totalConsumptions += c.getUnitPrice() * c.getQuantity();
                }
            }

            stay.setTotalDailies(totalDailies);
            stay.setTotalConsumptions(totalConsumptions);
            stay.setGrandTotal(totalDailies + totalConsumptions);

            stayRepository.save(stay);

            System.out.println(
                "Estadia encerrada para reserva " +
                    b.getId() +
                    " (total: R$ " +
                    stay.getGrandTotal() +
                    ")"
            );
        }
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }
}
